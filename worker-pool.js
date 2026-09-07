/**
 * A pool of decoder workers speaking a small request/response protocol:
 * requests carry a numeric `id`, replies are `{ type: "decode", id, ... }` on
 * success or `{ type: "error", id, error }` on failure.
 *
 * The pool owns scheduling, reply routing, result caching and teardown; how a
 * worker is created and initialised is left to `createWorker`, since each
 * decoder loads its own transcoder.
 * @private
 */
class WorkerPool {
  /**
   * @param {object} options
   * @param {() => Promise<Worker>} options.createWorker Creates a worker that is ready to accept decode requests — including any transcoder initialisation.
   * @param {number} [options.workerLimit=4] Maximum number of concurrent workers.
   */
  constructor({ createWorker, workerLimit = 4 }) {
    this.createWorker = createWorker;
    this.workerLimit = workerLimit;

    this.workers = [];
    this.nextTaskId = 0;
    this.taskCache = new WeakMap();
  }

  #register(worker) {
    // Pending tasks for this worker, by id. Kept on the pool rather than as
    // expando properties on the Worker instance.
    const callbacks = new Map();

    worker.onmessage = ({ data: message }) => {
      const callback = callbacks.get(message.id);
      // An id-less error (a failed transcoder init) fails every task queued on
      // this worker, since none of them can now complete.
      if (!callback) {
        if (message.type === "error") this.#failWorker(worker, message.error);
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
      this.#failWorker(worker, message ?? "worker error");
    worker.onmessageerror = () =>
      this.#failWorker(worker, "worker message could not be deserialized");

    return { worker, callbacks, costs: new Map(), load: 0 };
  }

  #failWorker(worker, error) {
    const entry = this.workers.find((candidate) => candidate.worker === worker);
    if (!entry) return;

    for (const { reject } of entry.callbacks.values()) reject(new Error(error));
    entry.callbacks.clear();
    entry.costs.clear();
    entry.load = 0;
  }

  async #acquire(cost) {
    if (this.workers.length < this.workerLimit) {
      this.workers.push(this.#register(await this.createWorker()));
    }

    const entry = this.workers.reduce((least, candidate) =>
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
  }

  /**
   * Run one decode task, reusing the cached result when the same buffer is
   * decoded again with the same configuration.
   * @param {object} options
   * @param {object} options.message Payload merged with `{ type: "decode", id }` and posted to the worker.
   * @param {Transferable[]} [options.transfer=[]] Buffers to transfer rather than clone.
   * @param {number} [options.cost=0] Relative task weight used to balance load across workers.
   * @param {string} [options.key] Configuration identity — a cache hit requires a matching key.
   * @param {ArrayBuffer} [options.cacheKey] Buffer the result is cached against.
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
    for (const entry of this.workers) {
      this.#failWorker(entry.worker, "worker pool disposed");
      entry.worker.terminate();
    }
    this.workers = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

export default WorkerPool;
