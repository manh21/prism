import { TypedEmitter } from 'tiny-typed-emitter';
import { GameMap } from '../types/gamemap';
import { ServerDetail } from '../types/serverdetail';
import Message from './message';

export interface IEmissions {
  // Utilities
  log: (message: any) => void;
  error: (message: any) => void;

  // Chat
  game: (message: Message) => void;
  adminalert: (message: Message) => void;
  response: (message: Message) => void;

  // Commands
  APIAdminResult: (message: Message) => void;
  maplist: (message: GameMap[]) => void;
  serverdetails: (message: ServerDetail) => void;
}

class EventBus extends TypedEmitter<IEmissions> {
  constructor() {
    super();
  }

  onetime(events: any, handler: any) {
    if (!events) return;

    // Ugly, but helps getting the rest of the function
    // short and simple to the eye ... I guess...
    if (!(events instanceof Array)) events = [events];

    const _this = this;

    const cb = function () {
      events.forEach(function (e: any) {
        // This only removes the listener itself
        // from all the events that are listening to it
        // i.e., does not remove other listeners to the same event!
        _this.removeListener(e, cb);
      });

      // This will allow any args you put in xxx.emit('event', ...) to be sent
      // to your handler
      handler.apply(_this, Array.prototype.slice.call(arguments, 0));
    };

    events.forEach(function (e: any) {
      _this.addListener(e, cb);
    });
  }

  groups(events: any, handler: any) {
    if (!events) return;

    // Ugly, but helps getting the rest of the function
    // short and simple to the eye ... I guess...
    if (!(events instanceof Array)) events = [events];

    const _this = this;

    // A helper function that will generate a handler that
    // removes itself when its called
    const generateCallback = function (eventName: any) {
      const cb = function () {
        _this.removeListener(eventName, cb);
        // This will allow any args you put in
        // xxx.emit('event', ...) to be sent
        // to your handler
        handler.apply(_this, Array.prototype.slice.call(arguments, 0));
      };
      return cb;
    };

    events.forEach(function (e: any) {
      _this.addListener(e, generateCallback(e));
    });
  }
}

export default EventBus;
