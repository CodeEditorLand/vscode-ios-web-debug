// Typings for localtunnel
declare interface ILocalTunnelInfoObject {
    url: string;
    close: () => void;
    on(event: string, listener: Function): this;
}

declare module 'localtunnel' {  
    function temp(port: number, callback: (err: Error, tunnel: ILocalTunnelInfoObject) => void): void;
    module temp {}
    export = temp;
}

