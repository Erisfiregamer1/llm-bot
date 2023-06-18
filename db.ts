import { default as Keyv } from "npm:keyv";

import { KeyvFile } from "npm:keyv-file"

const keyv: any = new Keyv({
    store: new KeyvFile({
        filename: "./db.json"
    })
});

export { keyv };
