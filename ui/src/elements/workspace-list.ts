import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import {
  DocumentStore,
  synDocumentContext,
  Workspace,
  WorkspaceStore,
} from "@holochain-syn/core";
import { TextEditorGrammar } from "@holochain-syn/text-editor";

import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/relative-time/relative-time.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import { joinAsync, pipe, StoreSubscriber } from "@holochain-open-dev/stores";
import { localized, msg } from "@lit/localize";
import { sharedStyles } from "@holochain-open-dev/elements";
import { EntryRecord } from "@holochain-open-dev/utils";
import { AgentPubKey } from "@holochain/client";

@localized()
@customElement("workspace-list")
export class WorkspaceList extends LitElement {
  @consume({ context: synDocumentContext, subscribe: true })
  @property()
  documentStore!: DocumentStore<TextEditorGrammar>;

  @property()
  activeWorkspace!: string;

  _allWorkspaces = new StoreSubscriber(
    this,
    () =>
      pipe(
        this.documentStore.allWorkspaces,
        (workspaces) =>
          joinAsync(
            workspaces.map(
              (w) =>
                new WorkspaceStore(this.documentStore, w.entryHash)
                  .sessionParticipants
            )
          ),
        (participants, workspaces) =>
          [workspaces, participants] as [
            Array<EntryRecord<Workspace>>,
            Array<Array<AgentPubKey>>
          ]
      ),
    () => []
  );

  renderWorkspace(
    workspace: EntryRecord<Workspace>,
    participants: AgentPubKey[]
  ) {
    const alreadyJoined = this.activeWorkspace === workspace.entry.name;
    return html`
      <div class="row" style="align-items: center; gap: 8px;">
        <span style="flex: 1;"> ${workspace.entry.name} </span>

        ${participants.map(
          (p) => html`<agent-avatar .agentPubKey=${p}></agent-avatar>`
        )}
        <sl-button
          .disabled=${alreadyJoined}
          @click=${() => {
            this.dispatchEvent(
              new CustomEvent("join-workspace", {
                detail: {
                  workspaceHash: workspace.entryHash,
                  workspace,
                },
                composed: true,
                bubbles: true,
              })
            );
          }}
          >${alreadyJoined ? msg("Already Joined") : msg("Join")}</sl-button
        >
      </div>
    `;
  }

  render() {
    switch (this._allWorkspaces.value.status) {
      case "pending":
        return html`
          <sl-skeleton></sl-skeleton>
          <sl-skeleton></sl-skeleton>
          <sl-skeleton></sl-skeleton>
        `;

      case "complete":
        const workspaces = this._allWorkspaces.value.value[0];
        const participants = this._allWorkspaces.value.value[1];
        return html`
          <sl-card style="flex: 1; display: flex">
            <span slot="header" class="title">${msg("Workspaces")}</span>
            <div class="column" style="flex: 1; gap: 8px">
              ${workspaces.length === 0
                ? html`
                    <div
                      class="row"
                      style="flex: 1; align-items: center; justify-content: center;"
                    >
                      <span class="placeholder">There are no workspaces</span>
                    </div>
                  `
                : html`
                    ${workspaces.map((workspace, i) =>
                      this.renderWorkspace(workspace, participants[i])
                    )}
                  `}
            </div>
          </sl-card>
        `;

      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the workspaces")}
          .error=${this._allWorkspaces.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
