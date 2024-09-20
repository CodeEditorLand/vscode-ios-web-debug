/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as mockery from 'mockery';
import * as assert from 'assert';
import { utils } from 'vscode-chrome-debug-core';

/** Not mocked - use for type only */
import * as _Utilities from '../src/utilities';

const MODULE_UNDER_TEST = '../src/utilities';
suite('Utilities', () => {
    function getUtilities(): typeof _Utilities {
        return require(MODULE_UNDER_TEST);
    }

    setup(() => {
        mockery.enable({ useCleanCache: true, warnOnReplace: false });
        mockery.registerAllowables([MODULE_UNDER_TEST]);
    });

    teardown(() => {
        mockery.deregisterAll();
        mockery.disable();
    });

    suite('getProxyPath()', () => {
        test('if windows and path exists, returns correct path', () => {
            mockery.registerMock('vscode-chrome-debug-core', {
                utils: {
                    Platform: { Windows: 0, OSX: 1, Linux: 2 },
                    getPlatform: () => utils.Platform.Windows,
                    existsSync: () => true
                }
            });

            mockery.registerMock('path', {
                resolve: (a, b) => b
            });

            const _Utilities = getUtilities();
            assert.equal(_Utilities.getProxyPath(), "../../node_modules/vs-libimobile/lib/ios_webkit_debug_proxy.exe");
        });

        test('if windows and path not found, returns null', () => {
            mockery.registerMock('vscode-chrome-debug-core', {
                utils: {
                    Platform: { Windows: 0, OSX: 1, Linux: 2 },
                    getPlatform: () => utils.Platform.Windows,
                    existsSync: () => false
                }
            });

            mockery.registerMock('path', {
                resolve: (a, b) => b
            });

            const _Utilities = getUtilities();
            assert.equal(_Utilities.getProxyPath(), null);
        });

        test('if osx, returns null', () => {
            mockery.registerMock('vscode-chrome-debug-core', {
                utils: {
                    Platform: { Windows: 0, OSX: 1, Linux: 2 },
                    getPlatform: () => utils.Platform.OSX
                }
            });
            mockery.registerMock('path', {});

            const _Utilities = getUtilities();
            assert.equal(_Utilities.getProxyPath(), null);
        });

        test('if linux, returns null', () => {
            mockery.registerMock('vscode-chrome-debug-core', {
                utils: {
                    Platform: { Windows: 0, OSX: 1, Linux: 2 },
                    getPlatform: () => utils.Platform.Linux
                }
            });
            mockery.registerMock('path', {});

            const _Utilities = getUtilities();
            assert.equal(_Utilities.getProxyPath(), null);
        });
    });
});
