// deno-lint-ignore no-global-assign
console = null;

self.onmessage = async (e) => {
  try {
    const response = `${eval(e.data)}`;

    postMessage(response);
  } catch (err) {
    postMessage(`Error occured during code processing: ${err}`);
  }
};
