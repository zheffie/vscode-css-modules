import {
    workspace,
    window,
    OverviewRulerLane,
    ExtensionContext,
    DecorationOptions,
    MarkdownString,
    Range,
} from "vscode";

import * as path from "path";
import * as _ from "lodash";

import {
    getCurrentLine,
    getWords,
    findImportPath,
    getAllClassNames,
} from "./utils";

export function initializeDecorations(context: ExtensionContext) {
    let activeEditor = window.activeTextEditor;
    if (!activeEditor) {
        return Promise.resolve(null);
    }
    let document = activeEditor.document;
    let selection = activeEditor.selection;
    let position = selection.start;
    if (position === undefined) {
        return Promise.resolve(null);
    }
    const currentLine = getCurrentLine(document, position);
    const currentDir = path.dirname(document.uri.fsPath);

    const words = getWords(currentLine, position);
    if (words === "" || words.indexOf(".") === -1) {
        return Promise.resolve([]);
    }

    const [obj, field] = words.split(".");

    const DecorationType = window.createTextEditorDecorationType({
        borderWidth: "1px",
        borderStyle: "solid",
        overviewRulerColor: "blue",
        overviewRulerLane: OverviewRulerLane.Right,
        light: {
            // this color will be used in light color themes
            borderColor: "darkblue",
        },
        dark: {
            // this color will be used in dark color themes
            borderColor: "lightblue",
        },
    });

    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        const importPath = findImportPath(document.getText(), obj, currentDir);
        if (importPath === "") {
            return Promise.resolve([]);
        }
        let classnames = getAllClassNames(importPath, "");

        const words = getWords(currentLine, position);
        if (words === "" || words.indexOf(".") === -1) {
            return Promise.resolve(null);
        }

        const regexString = "(?<=" + obj + ".)([0-9a-zA-Z]*)";
        const regEx = new RegExp(regexString, "g");
        const text = activeEditor.document.getText();
        const missingClassnames: DecorationOptions[] = [];
        let match;

        while ((match = regEx.exec(text))) {
            if (classnames.indexOf(match[0]) < 0) {
                const startPos = activeEditor.document.positionAt(match.index);
                const endPos = activeEditor.document.positionAt(
                    match.index + match[0].length
                );

                let md = new MarkdownString(
                    "[Create class ." +
                        match[0] +
                        "](command:cssModules.createclass) "
                );
                md.isTrusted = true;

                const decoration = {
                    range: new Range(startPos, endPos),
                    hoverMessage: md,
                };

                missingClassnames.push(decoration);
            }
        }
        activeEditor.setDecorations(DecorationType, missingClassnames);
    }
    let timeout: NodeJS.Timer | undefined = undefined;

    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }

    if (activeEditor) {
        triggerUpdateDecorations();
    }

    window.onDidChangeActiveTextEditor(
        (editor) => {
            activeEditor = editor;
            if (editor) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );

    workspace.onDidChangeTextDocument(
        (event) => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );
}
