import { Location, window, commands } from "vscode";
import {
    getCurrentLine,
    findImportPath,
    CamelCaseValues,
    getWords,
    getPosition,
} from "./utils";
import * as path from "path";
import * as fs from "fs";
import * as _ from "lodash";

export const CommandHandler = async (camelCaseConfig: CamelCaseValues) => {
    let editor = window.activeTextEditor;
    if (!editor) {
        return Promise.resolve(null);
    }
    let document = editor.document;
    let selection = editor.selection;
    let position = selection.start;
    if (position === undefined) {
        return Promise.resolve(null);
    }
    const range = document.getWordRangeAtPosition(position);
    const keyWord = document.getText(range);
    const currentDir = path.dirname(document.uri.fsPath);
    const currentLine = getCurrentLine(document, position);

    const words = getWords(currentLine, position);

    if (words === "" || words.indexOf(".") === -1) {
        return Promise.resolve(null);
    }

    const [obj, field] = words.split(".");
    const filePath = findImportPath(document.getText(), obj, currentDir);

    if (filePath === "") {
        return Promise.resolve(null);
    }

    const targetPosition = getPosition(filePath, field, camelCaseConfig);
    if (!targetPosition) {
        let content = fs.readFileSync(filePath, { encoding: "utf8" });
        content += "\r\n." + keyWord + " {\r\n\r\n}\r\n\r\n";
        fs.writeFileSync(filePath, content, { encoding: "utf8" });

        commands
            .executeCommand<Location[]>(
                "editor.action.peekDefinition",
                editor.document.uri,
                position
            )
            .then((ref) => console.log(ref));
    }
};
