/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export interface IProxySettings {
    proxyPath: string;
    optionalDeviceName: string;
    proxyPort: number,
    proxyArgs: string[],
    originalArgs: any
}