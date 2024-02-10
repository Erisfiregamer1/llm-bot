export function safeEval(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      import.meta.resolve("./eval_worker.js"),
      {
        type: "module",
        name,
        deno: {
          //@ts-ignore ignore the namespace annotation. Deno < 1.22 required this
          namespace: false,
          permissions: {
            env: false,
            hrtime: false,
            net: true,
            ffi: false,
            read: false,
            run: false,
            write: false,
          },
        },
      },
    );

    let timeoutId: number;

    worker.onmessage = (msg) => {
      console.log(msg.data);
      clearTimeout(timeoutId);
      if (typeof msg.data !== "string") {
        worker.terminate();
        reject("Worker returned a corrupt message!");
      } else {
        worker.terminate();
        resolve(msg.data);
      }
    };

    worker.postMessage(code);

    timeoutId = setTimeout(() => {
      console.log("early termination");
      worker.terminate(); // What's taking YOU so long, hmm?
      reject("Worker did not respond in time!");
    }, 10000);
  });
}
