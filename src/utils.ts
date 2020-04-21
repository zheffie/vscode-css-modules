import { Position, TextDocument } from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as _ from "lodash";

export function getCurrentLine(
    document: TextDocument,
    position: Position
): string {
    return document.getText(document.lineAt(position).range);
}

export function genImportRegExp(key: string): RegExp {
    const file = "(.+\\.\\S{1,2}ss)";
    const fromOrRequire = "(?:from\\s+|=\\s+require(?:<any>)?\\()";
    const requireEndOptional = "\\)?";
    const pattern = `${key}\\s+${fromOrRequire}["']${file}["']${requireEndOptional}`;
    return new RegExp(pattern);
}

export function findImportPath(
    text: string,
    key: string,
    parentPath: string
): string {
    const re = genImportRegExp(key);
    const results = re.exec(text);
    if (!!results && results.length > 0) {
        return path.resolve(parentPath, results[1]);
    } else {
        return "";
    }
}

export function getAllClassNames(filePath: string, keyword: string): string[] {
    const content = fs.readFileSync(filePath, { encoding: "utf8" });
    const lines = content.match(/.*[,{]/g);
    if (lines === null) {
        return [];
    }

    const classNames = lines.join(" ").match(/\.[_A-Za-z0-9\-]+/g);
    if (classNames === null) {
        return [];
    }

    const uniqNames = _.uniq(classNames).map((item) => item.slice(1));
    return keyword !== ""
        ? uniqNames.filter((item) => item.indexOf(keyword) !== -1)
        : uniqNames;
}

export function getWords(line: string, position: Position): string {
    const headText = line.slice(0, position.character);
    const startIndex = headText.search(/[a-zA-Z0-9\._]*$/);
    // not found or not clicking object field
    if (startIndex === -1 || headText.slice(startIndex).indexOf(".") === -1) {
        return "";
    }

    const match = /^([a-zA-Z0-9\._]*)/.exec(line.slice(startIndex));
    if (match === null) {
        return "";
    }

    return match[1];
}

export function getTransformer(camelCaseConfig: CamelCaseValues): Function {
    switch (camelCaseConfig) {
        case true:
            return _.camelCase;
        case "dashes":
            return dashesCamelCase;
        default:
            return null;
    }
}

export function getPosition(
    filePath: string,
    className: string,
    camelCaseConfig: CamelCaseValues
): Position {
    const content = fs.readFileSync(filePath, { encoding: "utf8" });
    const lines = content.split("\n");

    let lineNumber = -1;
    let character = -1;
    let keyWord = className;
    const classTransformer = getTransformer(camelCaseConfig);
    if (camelCaseConfig !== true) {
        // is false or 'dashes'
        keyWord = `.${className}`;
    }

    for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i];
        /**
         * The only way to guarantee that a position will be returned for a camelized class
         * is to check after camelizing the source line.
         * Doing the opposite -- uncamelizing the used classname -- would not always give
         * correct result, as camelization is lossy.
         * i.e. `.button--disabled`, `.button-disabled` both give same
         * final class: `css.buttonDisabled`, and going back from this to that is not possble.
         *
         * But this has a drawback - camelization of a line may change the final
         * positions of classes. But as of now, I don't see a better way, and getting this
         * working is more important, also putting this functionality out there would help
         * get more eyeballs and hopefully a better way.
         */
        const line = !classTransformer
            ? originalLine
            : classTransformer(originalLine);
        character = line.indexOf(keyWord);

        if (character === -1 && !!classTransformer) {
            // if camelized match fails, and transformer is there
            // try matching the un-camelized classnames too!
            character = originalLine.indexOf(keyWord);
        }

        if (character !== -1) {
            lineNumber = i;
            break;
        }
    }

    if (lineNumber === -1) {
        return null;
    } else {
        return new Position(lineNumber, character + 1);
    }
}

export function isImportLineMatch(
    line: string,
    matches: RegExpExecArray,
    current: number
): boolean {
    if (matches === null) {
        return false;
    }

    const start1 = line.indexOf(matches[1]) + 1;
    const start2 = line.indexOf(matches[2]) + 1;

    // check current character is between match words
    return (
        (current > start2 && current < start2 + matches[2].length) ||
        (current > start1 && current < start1 + matches[1].length)
    );
}
// from css-loader's implementation
// source: https://github.com/webpack-contrib/css-loader/blob/22f6621a175e858bb604f5ea19f9860982305f16/lib/compile-exports.js
export function dashesCamelCase(str) {
    return str.replace(/-(\w)/g, function (match, firstLetter) {
        return firstLetter.toUpperCase();
    });
}

export type CamelCaseValues = false | true | "dashes";
