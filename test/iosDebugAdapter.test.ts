/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as mockery from 'mockery';
import * as assert from 'assert';
import * as sinon from 'sinon';
import {utils, ChromeDebugAdapter, ChromeConnection, chromeTargetDiscoveryStrategy, logger} from 'vscode-chrome-debug-core';

/** Not mocked - use for type only */
import {IOSDebugAdapter as _IOSDebugAdapter} from '../src/iosDebugAdapter';

const MODULE_UNDER_TEST = '../src/iosDebugAdapter';
suite('IOSDebugAdapter', () => {

    function createAdapter(): _IOSDebugAdapter {
        const IOSDebugAdapter: typeof _IOSDebugAdapter = require(MODULE_UNDER_TEST).IOSDebugAdapter;
        const targetFilter = target => target && (!target.type || target.type === 'page');
        const connection = new ChromeConnection(chromeTargetDiscoveryStrategy.getChromeTargetWebSocketURL, targetFilter);

        return new IOSDebugAdapter(connection);
    };

    setup(() => {
        mockery.enable({ useCleanCache: true, warnOnReplace: false });
        mockery.registerAllowables([MODULE_UNDER_TEST, './utilities', 'path', 'child_process']);
        mockery.warnOnUnregistered(false); // The npm packages pull in too many modules to list all as allowable
        
        // Stub wrapMethod to create a function if it doesn's already exist
        let originalWrap = (<any>sinon).wrapMethod;
        sinon.stub(sinon, 'wrapMethod', function(...args) {
            if (!args[0][args[1]]) {
                args[0][args[1]] = () => { };
            }
            return originalWrap.apply(this, args);
        });
    });

    teardown(() => {
        (<any>sinon).wrapMethod.restore();

        mockery.deregisterAll();
        mockery.disable();
    });

    suite('launch()', () => {
        suite('no port', () => {
            test('if no port, rejects the launch promise', done => {
                mockery.registerMock('vscode-chrome-debug-core', {
                    ChromeDebugAdapter: () => { },
                    utils: utils,
                    logger: logger
                });

                const adapter = createAdapter();
                return adapter.launch({}).then(
                    () => assert.fail('Expecting promise to be rejected'),
                    e => done()
                );
            });
        });
        
        suite('start server', () => {
            let adapterMock;
            let chromeConnectionMock;
            let utilitiesMock;
            let cpMock;
            let MockUtilities;
            let MockChromeConnection;
            setup(() => {        
                let deviceInfo = [
                    {
                        url: 'localhost:' + 8080,
                        deviceName: 'iphone1'
                    },
                    {
                        url: 'localhost:' + (8080 + 1),
                        deviceName: 'iphone2'
                    }
                ];
                MockChromeConnection = { };
                class MockAdapter { 
                    public _chromeConnection = MockChromeConnection;
                };
                class MockChildProcess { };
                MockUtilities = {
                    Platform: { Windows: 0, OSX: 1, Linux: 2 }
                };

                mockery.registerMock('vscode-chrome-debug-core', {
                    ChromeDebugAdapter: MockAdapter,
                    utils: MockUtilities,
                    logger: logger
                });
                mockery.registerMock('child_process', MockChildProcess);

                adapterMock = sinon.mock(MockAdapter.prototype);
                adapterMock.expects('setupLogging').once();
                adapterMock.expects('attach').returns(Promise.resolve(''));
                
                chromeConnectionMock = sinon.mock(MockChromeConnection);
                chromeConnectionMock.expects('sendMessage').withArgs("Page.navigate");

                utilitiesMock = sinon.mock(MockUtilities);
                utilitiesMock.expects('getURL').returns(Promise.resolve(JSON.stringify(deviceInfo)));
                sinon.stub(MockUtilities, 'errP', () => Promise.reject(''));

                cpMock = sinon.mock(MockChildProcess);
                cpMock.expects('spawn').once().returns({ unref: () => { }, on: () => { } });
            });

            teardown(() => {
                chromeConnectionMock.verify();
                adapterMock.verify();
                utilitiesMock.verify();
                cpMock.verify();
            });
            
            test('no settings should skip tunnel', done => {
                let isTunnelCreated = false;
                var MockServer = {};
                var MockTunnel = () => { isTunnelCreated = true; };
                mockery.registerMock('localtunnel', MockTunnel);
                
                const adapter = createAdapter();
                return adapter.launch({ port: 1234, proxyExecutable: 'test.exe' }).then(
                    () => {
                        assert.equal(isTunnelCreated, false, "Should not create tunnel");
                        return done();
                    },
                    e => assert.fail('Expecting promise to succeed')
                );
            });

            suite('with settings', () => {
                let isTunnelCreated: boolean;
                let expectedWebRoot: string;
                let expectedPort: number;
                let instanceMock;
                let MockServer = {};
                let MockTunnelInstance = {};
                setup(() => {   
                    isTunnelCreated = false;
                    expectedWebRoot = "root";
                    expectedPort = 8080;
                    var MockTunnel = (a, f) => { isTunnelCreated = true; f(null, MockTunnelInstance); };
                    MockTunnelInstance = { url: "index.html" };
                    
                    mockery.registerMock('localtunnel', MockTunnel);                    
                    instanceMock = sinon.mock(MockTunnelInstance);
                    instanceMock.expects("on").once();
                    
                });
                teardown(() => {
                    assert.equal(isTunnelCreated, true, "Should create tunnel");
                    instanceMock.verify();
                });
                                
                test('tunnelPort alone should start the localtunnel', done => {                    
                    const adapter = createAdapter();
                    return adapter.launch({ port: 1234, proxyExecutable: 'test.exe', tunnelPort: 9283 }).then(
                        () => done(),
                        e => assert.fail('Expecting promise to succeed')
                    );
                });
                
                test('tunnelPort should use tunnel url', done => {
                    let expectedUrl = "http://localtunnel.me/path/";
                    MockTunnelInstance = { url: expectedUrl };
                    
                    instanceMock = sinon.mock(MockTunnelInstance);
                    instanceMock.expects("on").once();
                                        
                    chromeConnectionMock.restore();
                    chromeConnectionMock = sinon.mock(MockChromeConnection);
                    chromeConnectionMock.expects('sendMessage').withArgs("Page.navigate", {url: expectedUrl});
                    
                    const adapter = createAdapter();
                    return adapter.launch({ port: 1234, proxyExecutable: 'test.exe', tunnelPort: 9283 }).then(
                        () => done(),
                        e => assert.fail('Expecting promise to succeed')
                    );
                });
                
                test('tunnelPort should merge url', done => {
                    let tunnelUrl = "http://localtunnel.me/";
                    let argsUrl = "http://website.com/index.html";
                    let expectedUrl = tunnelUrl + "index.html";
                    MockTunnelInstance = { url: tunnelUrl };
                    
                    instanceMock = sinon.mock(MockTunnelInstance);
                    instanceMock.expects("on").once();
                                        
                    chromeConnectionMock.restore();
                    chromeConnectionMock = sinon.mock(MockChromeConnection);
                    chromeConnectionMock.expects('sendMessage').withArgs("Page.navigate", {url: expectedUrl});
                    
                    const adapter = createAdapter();
                    return adapter.launch({ port: 1234, proxyExecutable: 'test.exe', tunnelPort: 9283, url: argsUrl }).then(
                        () => done(),
                        e => assert.fail('Expecting promise to succeed')
                    );
                });
            });
        });
    });
    
    suite('attach()', () => {
        suite('no port', () => {
            test('if no port, rejects the attach promise', done => {
                mockery.registerMock('vscode-chrome-debug-core', {
                    ChromeDebugAdapter: () => { },
                    utils: utils,
                    logger: logger
                });

                const adapter = createAdapter();
                return adapter.attach({}).then(
                    () => assert.fail('Expecting promise to be rejected'),
                    e => done()
                );
            });
        });

        suite('valid port', () => {
            let adapterMock;
            let utilitiesMock;
            let cpMock;
            let MockUtilities;
            setup(() => {
                class MockAdapter { };
                class MockChildProcess { };
                MockUtilities = {
                    Platform: { Windows: 0, OSX: 1, Linux: 2 }
                };

                mockery.registerMock('vscode-chrome-debug-core', {
                    ChromeDebugAdapter: MockAdapter,
                    utils: MockUtilities,
                    logger: logger
                });
                mockery.registerMock('child_process', MockChildProcess);

                adapterMock = sinon.mock(MockAdapter.prototype);
                adapterMock.expects('setupLogging').once();

                utilitiesMock = sinon.mock(MockUtilities);
                sinon.stub(MockUtilities, 'errP', () => Promise.reject(''));

                cpMock = sinon.mock(MockChildProcess);
            });

            teardown(() => {
                adapterMock.verify();
                utilitiesMock.verify();
                cpMock.verify();
            });

            test('if no proxy, returns error on osx', done => {
                sinon.stub(MockUtilities, 'getPlatform', () => MockUtilities.Platform.OSX);

                const adapter = createAdapter();
                return adapter.attach({ port: 1234 }).then(
                    () => assert.fail('Expecting promise to be rejected'),
                    e => {
                        adapterMock.verify();
                        return done();
                    }
                );
            });

            test('if no proxy, returns error on linux', done => {
                sinon.stub(MockUtilities, 'getPlatform', () => MockUtilities.Platform.Linux);

                const adapter = createAdapter();
                return adapter.attach({ port: 1234 }).then(
                    () => assert.fail('Expecting promise to be rejected'),
                    e => {
                        adapterMock.verify();
                        return done();
                    }
                );
            });

            test('if no proxy, returns error on windows', done => {
                sinon.stub(MockUtilities, 'getPlatform', () => MockUtilities.Platform.Windows);
                sinon.stub(MockUtilities, 'existsSync', () => false);

                const adapter = createAdapter();
                return adapter.attach({ port: 1234 }).then(
                    () => assert.fail('Expecting promise to be rejected'),
                    e => {
                        adapterMock.verify();
                        return done();
                    }
                );
            });

            test('if valid port and proxy path, spawns the proxy', done => {
                sinon.stub(MockUtilities, 'getPlatform', () => MockUtilities.Platform.Windows);
                sinon.stub(MockUtilities, 'existsSync', () => true);
                utilitiesMock.expects('getURL').returns(Promise.reject(''));

                cpMock.expects('spawn').once().returns({ unref: () => { }, on: () => { } });

                const adapter = createAdapter();
                return adapter.attach({ port: 1234 }).then(
                    () => assert.fail('Expecting promise to be rejected'),
                    e => {
                        adapterMock.verify();
                        utilitiesMock.verify();
                        cpMock.verify();
                        return done();
                    }
                );
            });
        });

        suite('device', () => {
            let adapterMock;
            let utilitiesMock;
            let cpMock;
            setup(() => {
                class MockAdapter { };
                class MockChildProcess { };
                var MockUtilities = {
                    Platform: { Windows: 0, OSX: 1, Linux: 2 },
                    Logger: { log: () => { } }
                };

                mockery.registerMock('vscode-chrome-debug-core', {
                    ChromeDebugAdapter: MockAdapter,
                    utils: MockUtilities,
                    logger: logger
                });
                mockery.registerMock('child_process', MockChildProcess);

                adapterMock = sinon.mock(MockAdapter.prototype);
                adapterMock.expects('setupLogging').once();

                utilitiesMock = sinon.mock(MockUtilities);

                cpMock = sinon.mock(MockChildProcess);
                cpMock.expects('spawn').once().returns({ unref: () => { }, on: () => { } });
            });

            teardown(() => {
                adapterMock.verify();
                utilitiesMock.verify();
                cpMock.verify();
            });

            test('if no proxy data, returns the proxy port', done => {
                let proxyPort = 1234;
                let deviceInfo = [];
                utilitiesMock.expects('getURL').returns(Promise.resolve(JSON.stringify(deviceInfo)));

                adapterMock.expects('attach').withArgs(sinon.match({
                    port: proxyPort,
                    cwd: ''
                })).returns(Promise.resolve(''));

                const adapter = createAdapter();
                return adapter.attach({ port: proxyPort, proxyExecutable: 'test.exe' }).then(
                    done(),
                    e => assert.fail('Expecting promise to succeed')
                );
            });
            
            test('if valid proxy data, returns the first device port', done => {
                let proxyPort = 1234;
                let devicePort = 9999;
                let deviceInfo = [
                    {
                        url: 'localhost:' + devicePort,
                        deviceName: 'iphone1'
                    },
                    {
                        url: 'localhost:' + (devicePort + 1),
                        deviceName: 'iphone2'
                    }
                ];
                utilitiesMock.expects('getURL').returns(Promise.resolve(JSON.stringify(deviceInfo)));

                adapterMock.expects('attach').withArgs(sinon.match({
                    port: devicePort,
                    cwd: ''
                })).returns(Promise.resolve(''));

                const adapter = createAdapter();
                return adapter.attach({ port: proxyPort, proxyExecutable: 'test.exe' }).then(
                    done(),
                    e => assert.fail('Expecting promise to succeed')
                );
            });

            test('if valid proxy data and unknown deviceName, returns the first device port', done => {
                let proxyPort = 1234;
                let devicePort = 9999;
                let deviceInfo = [
                    {
                        url: 'localhost:' + devicePort,
                        deviceName: 'iphone1'
                    },
                    {
                        url: 'localhost:' + (devicePort + 1),
                        deviceName: 'iphone2'
                    }
                ];
                utilitiesMock.expects('getURL').returns(Promise.resolve(JSON.stringify(deviceInfo)));

                adapterMock.expects('attach').withArgs(sinon.match({
                    port: devicePort,
                    cwd: ''
                })).returns(Promise.resolve(''));

                const adapter = createAdapter();
                return adapter.attach({ port: proxyPort, proxyExecutable: 'test.exe', deviceName: 'nophone' }).then(
                    done(),
                    e => assert.fail('Expecting promise to succeed')
                );
            });

            test('if valid proxy data and * deviceName, returns the first device port', done => {
                let proxyPort = 1234;
                let devicePort = 9999;
                let deviceInfo = [
                    {
                        url: 'localhost:' + devicePort,
                        deviceName: 'iphone1'
                    },
                    {
                        url: 'localhost:' + (devicePort + 1),
                        deviceName: 'iphone2'
                    }
                ];
                utilitiesMock.expects('getURL').returns(Promise.resolve(JSON.stringify(deviceInfo)));

                adapterMock.expects('attach').withArgs(sinon.match({
                    port: devicePort,
                    cwd: ''
                })).returns(Promise.resolve(''));

                const adapter = createAdapter();
                return adapter.attach({ port: proxyPort, proxyExecutable: 'test.exe', deviceName: '*' }).then(
                    done(),
                    e => assert.fail('Expecting promise to succeed')
                );
            });

            test('if valid proxy data and valid deviceName, returns the matching device port', done => {
                let proxyPort = 1234;
                let devicePort = 9999;
                let deviceInfo = [
                    {
                        url: 'localhost:' + devicePort,
                        deviceName: 'iphone1'
                    },
                    {
                        url: 'localhost:' + (devicePort + 1),
                        deviceName: 'iphone2'
                    }
                ];
                utilitiesMock.expects('getURL').returns(Promise.resolve(JSON.stringify(deviceInfo)));

                adapterMock.expects('attach').withArgs(sinon.match({
                    port: devicePort + 1,
                    cwd: ''
                })).returns(Promise.resolve(''));

                const adapter = createAdapter();
                return adapter.attach({ port: proxyPort, proxyExecutable: 'test.exe', deviceName: 'IPHonE2' }).then(
                    done(),
                    e => assert.fail('Expecting promise to succeed')
                );
            });
            
            test('passes on sourceMaps argument', done => {
                let proxyPort = 1234;
                let deviceInfo = [];
                utilitiesMock.expects('getURL').returns(Promise.resolve(JSON.stringify(deviceInfo)));

                adapterMock.expects('attach').withArgs(sinon.match({
                    port: proxyPort,
                    cwd: '',
                    sourceMaps: true
                })).returns(Promise.resolve(''));

                const adapter = createAdapter();
                return adapter.attach({ port: proxyPort, proxyExecutable: 'test.exe', sourceMaps: true }).then(
                    done(),
                    e => assert.fail('Expecting promise to succeed')
                );
            });
        });
    });
});
