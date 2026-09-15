/**
 * A pool of decoder workers speaking a small request/response protocol:
 * requests carry a numeric `id`, replies are `{ type: "decode", id, ... }` on
 * success or `{ type: "error", id, error }` on failure.
 *
 * The pool owns scheduling, reply routing, result caching and teardown; how a
 * worker is created and initialised is left to `createWorker`, since each
 * decoder loads its own transcoder.
 *
 * @private
 */
class WorkerPool {
  /**
   * @param {object} options
   * @param {function(): Promise<Worker>} options.createWorker Creates a worker
   *   that is ready to accept decode requests — including any transcoder
   *   initialisation.
   * @param {number} [options.workerLimit=4] Maximum number of concurrent
   *   workers.
   */
  constructor({ createWorker, workerLimit = 4 }) {
    this.createWorker = createWorker;
    this.workerLimit = workerLimit;

    /** One promise per worker, pushed synchronously when the slot is claimed. */
    this.entries = [];
    /** Entries whose worker has finished being created. */
    this.live = new Set();
    /** Tasks assigned but not yet finished, tracked synchronously. */
    this.outstanding = 0;
    this.nextTaskId = 0;
    this.taskCache = new WeakMap();
    /**
     * Bumped by dispose(), so workers still being created can tell they are
     * already obsolete when they land.
     */
    this.generation = 0;
  }

  #spawn() {
    const generation = this.generation;
    const pending = this.createWorker().then((worker) => {
      // Pending tasks for this worker, by id. Kept on the pool rather than as
      // expando properties on the Worker instance.
      const entry = {
        worker,
        callbacks: new Map(),
        costs: new Map(),
        load: 0,
      };

      worker.onmessage = ({ data: message }) => {
        const callback = entry.callbacks.get(message.id);
        // An id-less error (a failed transcoder init) fails every task queued
        // on this worker, since none of them can now complete.
        if (!callback) {
          if (message.type === "error") this.#fail(entry, message.error);
          return;
        }
        if (message.type === "error") {
          callback.reject(new Error(message.error));
        } else {
          callback.resolve(message);
        }
      };

      // Without these a worker that fails to boot leaves every task pending.
      worker.onerror = ({ message }) =>
        this.#fail(entry, message ?? "worker error");
      worker.onmessageerror = () =>
        this.#fail(entry, "worker message could not be deserialized");

      // dispose() may have run while this worker was still being created.
      if (this.generation !== generation) {
        worker.terminate();
        throw new Error("pex-loaders: worker pool disposed");
      }

      this.live.add(entry);
      return entry;
    });

    // A failed spawn must not poison the pool: drop the slot so the next task
    // can try again, rather than leaving a rejected promise every later
    // Promise.all re-throws.
    pending.catch(() => {
      const index = this.entries.indexOf(pending);
      if (index !== -1) this.entries.splice(index, 1);
    });

    return pending;
  }

  #fail(entry, error) {
    for (const { reject } of entry.callbacks.values()) reject(new Error(error));
    entry.callbacks.clear();
    entry.costs.clear();
    entry.load = 0;
  }

  async #acquire(cost) {
    // Grow only when every worker already has work: each one costs a wasm
    // instance, so idle workers are pure overhead.
    //
    // The slot is claimed synchronously because #acquire is re-entered while
    // createWorker() is awaited — a check spanning that await would let every
    // queued task spawn its own worker, and `workerLimit` would never apply.
    if (
      this.outstanding >= this.entries.length &&
      this.entries.length < this.workerLimit
    ) {
      this.entries.push(this.#spawn());
    }
    this.outstanding++;

    let entries;
    try {
      entries = await Promise.all(this.entries);
    } catch (error) {
      this.outstanding--;
      throw error;
    }

    const entry = entries.reduce((least, candidate) =>
      candidate.load < least.load ? candidate : least,
    );

    const taskId = ++this.nextTaskId;
    entry.costs.set(taskId, cost);
    entry.load += cost;
    return { entry, taskId };
  }

  #release(entry, taskId) {
    entry.load -= entry.costs.get(taskId) ?? 0;
    entry.costs.delete(taskId);
    entry.callbacks.delete(taskId);
    this.outstanding--;
  }

  /**
   * Run one decode task, reusing the cached result when the same buffer is
   * decoded again with the same configuration.
   *
   * @param {object} options
   * @param {object} options.message Payload merged with `{ type: "decode", id
   *   }` and posted to the worker.
   * @param {Transferable[]} [options.transfer=[]] Buffers to transfer rather
   *   than clone.
   * @param {number} [options.cost=0] Relative task weight used to balance load
   *   across workers.
   * @param {string} [options.key] Configuration identity — a cache hit requires
   *   a matching key.
   * @param {ArrayBuffer} [options.cacheKey] Buffer the result is cached
   *   against.
   * @returns {Promise<object>} The worker's reply message.
   */
  run({ message, transfer = [], cost = 0, key, cacheKey }) {
    const cached = this.#cached(key, cacheKey);
    if (cached) return cached;

    const pending = this.#run({ message, transfer, cost });

    if (cacheKey) this.taskCache.set(cacheKey, { key, promise: pending });

    return pending;
  }

  #cached(key, cacheKey) {
    if (!cacheKey) return undefined;
    const entry = this.taskCache.get(cacheKey);
    return entry?.key === key ? entry.promise : undefined;
  }

  async #run({ message, transfer, cost }) {
    const { entry, taskId } = await this.#acquire(cost);

    try {
      const { promise, resolve, reject } = Promise.withResolvers();
      entry.callbacks.set(taskId, { resolve, reject });
      entry.worker.postMessage({ ...message, id: taskId }, transfer);
      return await promise;
    } finally {
      this.#release(entry, taskId);
    }
  }

  /** Terminate every worker. The pool can be used again afterwards. */
  dispose() {
    this.generation++;
    for (const entry of this.live) {
      this.#fail(entry, "worker pool disposed");
      entry.worker.terminate();
    }
    this.live.clear();
    // Workers still being created terminate themselves once they resolve; the
    // rejection that follows is theirs to swallow, not an unhandled one.
    for (const pending of this.entries) pending.catch(() => {});
    this.entries = [];
    this.outstanding = 0;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

export default WorkerPool;
