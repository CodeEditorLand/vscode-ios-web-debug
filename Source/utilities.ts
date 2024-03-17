/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { utils } from 'vscode-chrome-debug-core';
import * as path from 'path';

export function getProxyPath(): string {
    const platform = utils.getPlatform();
    if (platform === utils.Platform.Windows) {
        var proxy = path.resolve(__dirname, "../../node_modules/vs-libimobile/lib/ios_webkit_debug_proxy.exe");
        if (utils.existsSync(proxy)) {
            return proxy;
        }
    } else if (platform === utils.Platform.OSX) {
        let path = '/usr/local/bin/ios_webkit_debug_proxy'
        if (utils.existsSync(path)) {
            return path;
        }
    }

    return null;
}