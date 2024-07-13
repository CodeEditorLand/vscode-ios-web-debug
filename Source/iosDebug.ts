/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path'; 
import {ChromeDebugSession, ChromeConnection, chromeTargetDiscoveryStrategy, logger} from 'vscode-chrome-debug-core';
import {IOSDebugAdapter} from './iosDebugAdapter';

const targetFilter = target => target && (!target.type || target.type === 'page');
const connection = new ChromeConnection(chromeTargetDiscoveryStrategy.getChromeTargetWebSocketURL, targetFilter);

ChromeDebugSession.run(ChromeDebugSession.getSession({
    logFileDirectory: path.resolve(__dirname, '../../'),
    targetFilter: targetFilter,
    adapter: new IOSDebugAdapter(connection)
}));

logger.log('debugger-for-ios-web: ' + require('../../package.json').version);