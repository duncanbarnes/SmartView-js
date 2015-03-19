const net = require('net');
const util = require('util');
const events = require('events');
var Future;

const makeDiscoverer = require('./lib/discovery');
const SmartViewConnection = require('./lib/connection');

const SmartView = module.exports = new events.EventEmitter();
module.exports.setFuture = function(f) {Future = f};

SmartView.Connection = SmartViewConnection;

makeDiscoverer(SmartView);

SmartView.setBorder = function(address, monitor, color) {
	new SmartViewConnection(address, {
		connected: function() {
			this.on('acknowledgement', function() {this.close()});
			this.setBorder(monitor, color);
		}
	});
}



// Because SmartViews can only have one TCP socket open at the same time
// we create a new connection for every request and close it when the
// SmartView sends a response

SmartView.getInfo = function(address, callback) {
	var deviceInfo = new Future();
	var monitorInfo = new Future();
	var monitors = [];
	var networkSettings = new Future();

	Future.task(function() {
		const connection = new SmartViewConnection(address, {
			deviceInfo: function(info) {
				deviceInfo.return(info);
			},
			monitorInfo: function(monitor, info) {
				monitors.push(info);
				info.id = monitor;

				if (monitors.length == deviceInfo.wait().monitors) {
					monitorInfo.return(monitors);
				}
			},
			networkSettings: function(settings) {
				networkSettings.return(settings);
			}
		});

		var info = deviceInfo.wait();
		info.monitors = monitorInfo.wait();
		for (var key in networkSettings.wait()) {
			info[key] = networkSettings.wait()[key];
		}
		connection.close();
		callback(info);
	}).detach();
}