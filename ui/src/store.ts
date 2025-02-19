import { DnaHash } from "@holochain/client";
import { WeaveClient } from "@theweave/api";
import { createContext } from "@lit/context";

export class NotebooksStore  {
    constructor(public dnaHash:DnaHash, public weaveClient: WeaveClient | undefined) {
    }
}
export const notebooksContext = createContext<NotebooksStore>('notebooks-context');

