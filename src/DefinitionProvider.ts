import {
    DefinitionProvider,
    TextDocument,
    Position,
    CancellationToken,
    Location,
    Uri,
    window,
    commands,
} from "vscode";
import {
    getCurrentLine,
    findImportPath,
    genImportRegExp,
    dashesCamelCase,
    CamelCaseValues,
    isImportLineMatch,
    getWords,
    getPosition,
} from "./utils";
import * as path from "path";
import * as fs from "fs";
import * as _ from "lodash";

export class CSSModuleDefinitionProvider implements DefinitionProvider {
    _camelCaseConfig: CamelCaseValues = false;

    constructor(camelCaseConfig?: CamelCaseValues) {
        this._camelCaseConfig = camelCaseConfig;
    }

    public provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): Thenable<Location> {
        const currentDir = path.dirname(document.uri.fsPath);
        const currentLine = getCurrentLine(document, position);

        const matches = genImportRegExp("(\\S+)").exec(currentLine);
        if (isImportLineMatch(currentLine, matches, position.character)) {
            return Promise.resolve(
                new Location(
                    Uri.file(path.resolve(currentDir, matches[2])),
                    new Position(0, 0)
                )
            );
        }

        const words = getWords(currentLine, position);
        if (words === "" || words.indexOf(".") === -1) {
            return Promise.resolve(null);
        }

        const [obj, field] = words.split(".");
        const importPath = findImportPath(document.getText(), obj, currentDir);
        if (importPath === "") {
            return Promise.resolve(null);
        }

        const targetPosition = getPosition(
            importPath,
            field,
            this._camelCaseConfig
        );

        if (targetPosition === null) {
            return Promise.resolve(null);
        } else {
            return Promise.resolve(
                new Location(Uri.file(importPath), targetPosition)
            );
        }
    }
}

export default CSSModuleDefinitionProvider;
