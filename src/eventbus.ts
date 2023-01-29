import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
    onetime(events: any, handler: any) {
        if(! events) return;
    
        // Ugly, but helps getting the rest of the function
        // short and simple to the eye ... I guess...
        if(!(events instanceof Array))
            events = [events];
    
        var _this = this;
    
        var cb = function() {
            events.forEach(function(e: any) {
                // This only removes the listener itself
                // from all the events that are listening to it
                // i.e., does not remove other listeners to the same event!
                _this.removeListener(e, cb);
            });
    
            // This will allow any args you put in xxx.emit('event', ...) to be sent
            // to your handler
            handler.apply(_this, Array.prototype.slice.call(arguments, 0));
        };
    
        events.forEach(function(e: any) {
            _this.addListener(e, cb);
        });
    };
    

    groups(events: any, handler: any) {
        if(!events) return;
    
        // Ugly, but helps getting the rest of the function
        // short and simple to the eye ... I guess...
        if(!(events instanceof Array))
            events = [events];
    
        var _this = this;
    
        // A helper function that will generate a handler that
        // removes itself when its called
        var gen_cb = function(event_name: any) {
            var cb = function() {
                _this.removeListener(event_name, cb);
                // This will allow any args you put in
                // xxx.emit('event', ...) to be sent
                // to your handler
                handler.apply(_this, Array.prototype.slice.call(arguments, 0));
            };
            return cb;
        };
    
        events.forEach(function(e:any) {
            _this.addListener(e, gen_cb(e));
        });
    };
    
}

export default EventBus;