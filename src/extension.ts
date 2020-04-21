"use strict";

import {
    languages,
    commands,
    ExtensionContext,
    DocumentFilter,
    workspace,
} from "vscode";
import * as _ from "lodash";

import { CSSModuleCompletionProvider } from "./CompletionProvider";
import { CSSModuleDefinitionProvider } from "./DefinitionProvider";
import { CommandHandler } from "./CommandHandler";
import { CamelCaseValues } from "./utils";
import { initializeDecorations } from "./Decorator";

const extName = "cssModules";

export function activate(context: ExtensionContext) {
    initializeDecorations(context);
    const mode: DocumentFilter[] = [
        { language: "typescriptreact", scheme: "file" },
        { language: "javascriptreact", scheme: "file" },
        { language: "javascript", scheme: "file" },
    ];
    const configuration = workspace.getConfiguration(extName);
    const camelCaseConfig: CamelCaseValues = configuration.get(
        "camelCase",
        false
    );

    context.subscriptions.push(
        commands.registerCommand("cssModules.createclass", () =>
            CommandHandler(camelCaseConfig)
        )
    );

    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            mode,
            new CSSModuleCompletionProvider(camelCaseConfig),
            "."
        )
    );
    context.subscriptions.push(
        languages.registerDefinitionProvider(
            mode,
            new CSSModuleDefinitionProvider(camelCaseConfig)
        )
    );
}

export function deactivate() {}
