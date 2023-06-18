import { default as Keyv } from "npm:keyv";

import { KeyvFile } from "npm:keyv-file"

const keyv = new Keyv({
    store: new KeyvFile()
});

export { keyv };
