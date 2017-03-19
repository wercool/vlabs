import { EventEmitter, Injectable } from "@angular/core";

@Injectable()

export class GlobalEventsManager
{
    public showComponent: EventEmitter<any> = new EventEmitter();

    constructor()
    {

    }
}
