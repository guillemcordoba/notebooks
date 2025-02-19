import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { SliceStore } from '@holochain-syn/core';
import '@vanillawc/wc-codemirror/index.js';
import {
  AgentPubKey,
  decodeHashFromBase64,
  encodeHashToBase64,
} from '@holochain/client';
import { sharedStyles } from '@holochain-open-dev/elements';
import { derived, StoreSubscriber } from '@holochain-open-dev/stores';
import { styleMap } from 'lit/directives/style-map.js';
import { elemIdToPosition } from '../utils.js';
import {
  AgentSelection,
  TextEditorEphemeralState,
  TextEditorState,
  textEditorGrammar,
} from '../grammar.js';
import './agent-cursor.js';

@customElement('syn-md-editor')
export class SynMarkdownEditor extends LitElement {
  @property({ type: Object })
  slice!: SliceStore<TextEditorState, TextEditorEphemeralState>;

  @property({ type: Function})
  doSet = (val:string) => {
    const e = this.editorEl
    e.set(val)
  }

  _state = new StoreSubscriber(
    this,
    () => this.slice.state,
    () => [this.slice]
  );

  _cursors = new StoreSubscriber(
    this,
    () => this.slice.ephemeral,
    () => [this.slice]
  );

  _lastCursorPosition = 0;

  _cursorPosition = 0;

  editor: any;

  get editorEl() {
    return this.shadowRoot?.getElementById('editor')! as any;
  }

  firstUpdated() {
    this.editor = this.editorEl.editor;
    this.editor.setOption('lineWrapping', true)

    setTimeout(() => {
      this.editor.getInputField().click();
    }, 500);

    derived([this.slice.state, this.slice.ephemeral], i => i).subscribe(
      ([state, cursors]) => {
        const stateText = state.text.toString();
        const myAgentSelection =
          cursors[encodeHashToBase64(this.slice.myPubKey)];

        if (this.editor.doc.getValue() !== stateText) {
          console.log("Setting State Text")
          this.editor.doc.setValue(stateText);
          console.log("Done setting State Text")
        }
        if (myAgentSelection) {
          if (state.toString().length > 0) {
            const position = elemIdToPosition(
              myAgentSelection.left,
              myAgentSelection.position,
              state.text
            )!;

            this.editor.doc.setSelection(
              this.editor.posFromIndex(position),
              this.editor.posFromIndex(
                position + myAgentSelection.characterCount
              )
            );
          } else {
            this.editor.doc.setSelection(
              this.editor.posFromIndex(0),
              this.editor.posFromIndex(0)
            );
          }
        }
      }
    );

    this.editor.on('beforeChange', (_:any, e:any) => {
      if (e.origin === 'setValue') return;
      e.cancel();
      const fromIndex = this.editor.indexFromPos({
        line: e.from.line,
        ch: e.from.ch,
      });
      const toIndex = this.editor.indexFromPos({
        line: e.to.line,
        ch: e.to.ch,
      });
      if (toIndex > fromIndex) {
        this.onTextDeleted(fromIndex, toIndex - fromIndex);
      }

      if (e.text[0] !== '' || e.text.length > 1) {
        this.onTextInserted(
          this.editor.indexFromPos(e.from),
          e.text.join('\n')
        );
      }
    });

    this.editor.on('beforeSelectionChange', (_:any, e:any) => {
      if (e.origin !== undefined) {
        const ranges = e.ranges;
        // @ts-ignore
        const transformedRanges = ranges.map(r => ({
          from: this.editor.indexFromPos(r.anchor),
          to: this.editor.indexFromPos(r.head),
        }));
        this.onSelectionChanged(transformedRanges);
      }
    });
  }

  onTextInserted(from: number, text: string) {
    this.slice.change((state, eph) =>
      textEditorGrammar
        .changes(this.slice.myPubKey, state, eph)
        .insert(from, text)
    );
  }

  onTextDeleted(from: number, characterCount: number) {
    this.slice.change((state, eph) =>
      textEditorGrammar
        .changes(this.slice.myPubKey, state, eph)
        .delete(from, characterCount)
    );
  }

  onSelectionChanged(ranges: Array<{ from: number; to: number }>) {
    console.log("selectionChanged")
    this.slice.change((state, eph) =>
      textEditorGrammar
        .changes(this.slice.myPubKey, state, eph)
        .changeSelection(ranges[0].from, ranges[0].to - ranges[0].from)
    );
  }

  renderCursor(agent: AgentPubKey, agentSelection: AgentSelection) {
    const position = elemIdToPosition(
      agentSelection.left,
      agentSelection.position,
      this._state.value.text
    )!;
    if (!this.editor) return html``;

    if (this.editorEl.value.length < position) return html``;

    const coords = this.editor.cursorCoords(
      this.editor.posFromIndex(position),
      'local'
    );

    if (!coords) return html``;

    return html`<agent-cursor
      style=${styleMap({
        left: `${coords.left + 30}px`,
        top: `${coords.top}px`,
      })}
      class="cursor"
      .agent=${agent}
    ></agent-cursor>`;
  }

  render() {
    if (this._state.value === undefined) return html``;

    return html`
      <div
        style="position: relative; overflow: auto; flex: 1; background-color: white;"
      >
        <wc-codemirror
          id="editor"
          mode="markdown"
          style="height: auto;"
          viewport-margin="infinity"
        >
        </wc-codemirror>

        ${Object.entries(this._cursors.value)
          .filter(
            ([pubKeyB64, _]) =>
              pubKeyB64 !== encodeHashToBase64(this.slice.myPubKey)
          )
          .map(([pubKeyB64, position]) =>
            this.renderCursor(decodeHashFromBase64(pubKeyB64), position)
          )}
      </div>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex: 1;
        position: relative;
      }
      .cursor {
        position: absolute;
      }
    `,
  ];
}
