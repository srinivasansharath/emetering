
var app_myelectric4 = {
    energy_r: false,
    energy_y: false,
    energy_B: false,
    frequency: false,
    power_factor: false,
    temperature: false,
    humidity: false,
    powerfeed: false,
    dailyfeed: false,
    dailytype: false,

    daily_data: [],
    daily: [],

    raw_kwh_data: [],

    fastupdateinst: false,
    slowupdateinst: false,

    viewmode: "energy",
    unitcost: 0.17,
    currency: "pound",

    escale: 1,

    startofweek: [0,0],
    startofmonth: [0,0],
    startofyear: [0,0],
    startofday: 0,
    startalltime: 0,

    last_daytime:0,                 // used for reload kwhd daily graph
    last_startofweektime: 0,        // used for reloading statistics
    last_startofmonthtime: 0,
    last_startofyeartime: 0,

    lastupdate: 0,
    autoupdate: true,
    reload: true,
    feeds: {},

    kwhdtmp: [],

    // Include required javascript libraries
    include: [
        "Modules/app/lib/graph_bars.js",
        "Modules/app/lib/graph_lines.js",
        "Modules/app/lib/timeseries.js",
        "Modules/app/vis.helper.js"
    ],

    init: function()
    {
        var timewindow = (3600000*3.0*1);
        view.end = +new Date;
        view.start = view.end - timewindow;

        // -------------------------------------------------------------------------
        // Load settings
        // -------------------------------------------------------------------------

        // If settings exist for myelectric then we load them in here:
        // if (app.config["myelectric4"]!=undefined) {
            // app_myelectric4.powerfeed = app.config.myelectric.powerfeed;
            // app_myelectric4.dailyfeed = app.config.myelectric.dailyfeed;
            // app_myelectric4.dailytype = app.config.myelectric.dailytype;
            // app_myelectric4.currency = app.config.myelectric.currency;
            // app_myelectric4.unitcost = app.config.myelectric.unitcost;
        // } else {
            app.config.myelectric = {};
        // if no settings then try auto scanning for feeds with suitable names:
            var feeds = app_myelectric4.getfeedsbyid();
            for (z in feeds)
            {
                var name = feeds[z].name.toLowerCase();
                
                if (name.indexOf("node:4:engy_r")!=-1) {
                    app_myelectric4.powerfeed = z;
                }
                
                if (name.indexOf("node:4:engy_r")!=-1) {
                    app_myelectric4.dailyfeed = z;
                    app_myelectric4.dailytype = 0;
                }
                if (name.indexOf("node:4:engy_r")!=-1) {
                    app_myelectric4.energy_r = z;
                }

                if (name.indexOf("node:4:engy_y")!=-1) {
                    app_myelectric4.energy_y = z;
                }

                if (name.indexOf("node:4:engy_b")!=-1) {
                    app_myelectric4.energy_b = z;
                }
                
                if (name.indexOf("node:4:freq_r")!=-1) {
                    app_myelectric4.frequency = z;
                }

                if (name.indexOf("node:4:pwrf_r")!=-1) {
                    app_myelectric4.power_factor = z;
                }

                if (name.indexOf("node:4:temp")!=-1) {
                    app_myelectric4.temperature = z;
                }
                
                if (name.indexOf("node:4:humd")!=-1) {
                    app_myelectric4.humidity = z;
                }

            }
        //}
        
        if (app_myelectric4.dailytype>1) {
            app_myelectric4.dailytype = 0;
            app_myelectric4.dailyfeed = 0;
        }

        app_myelectric4.escale = 1.0;
        if (app_myelectric4.dailytype==0) app_myelectric4.escale = 0.001;
        if (app_myelectric4.dailytype==1) app_myelectric4.escale = 1.0;
        if (app_myelectric4.currency==undefined) app_myelectric4.currency = "";
        if (app_myelectric4.unitcost==undefined) app_myelectric4.unitcost = 0;
        // -------------------------------------------------------------------------
        // Decleration of myelectric events
        // -------------------------------------------------------------------------

        $(window).resize(function(){
            app_myelectric4.resize();
        });

        // When the config icon is pressed, populate dropdown feed selector menu's.
        // and set values if already selected

        $("#myelectric_openconfig").click(function(){

            // Load feed list, populate feed selectors and select the selected feed
            var feeds = app_myelectric4.getfeedsbyid();

            var out = "";
            for (z in feeds) {
                out +="<option value="+feeds[z].id+">"+feeds[z].name+"</option>";
            }
            $("#myelectric_powerfeed").html(out);
            $("#myelectric_powerfeed").val(app_myelectric4.powerfeed);

            $("#myelectric_dailyfeed").html(out);
            $("#myelectric_dailyfeed").val(app_myelectric4.dailyfeed);

            $("#myelectric_dailytype").val(app_myelectric4.dailytype);

            $("#myelectric_currency").val(app_myelectric4.currency);
            $("#myelectric_unitcost").val(app_myelectric4.unitcost);
            // Switch to the config interface
            $("#myelectric_config").show();
            $("#myelectric_body").hide();

            // Stop updaters
            if (app_myelectric4.fastupdateinst) clearInterval(app_myelectric4.fastupdateinst);
            if (app_myelectric4.slowupdateinst) clearInterval(app_myelectric4.slowupdateinst);
        });

        // Save configuration, values are simply placed in the config.
        // then updates are resumed

        $("#myelectric_configsave").click(function(){
            app_myelectric4.powerfeed = $("#myelectric_powerfeed").val();
            app_myelectric4.dailyfeed = $("#myelectric_dailyfeed").val();
            app_myelectric4.dailytype = $("#myelectric_dailytype").val();
            app_myelectric4.unitcost = $("#myelectric_unitcost").val();
            app_myelectric4.currency = $("#myelectric_currency").val();

            // Save config to db
            var config = app.config;
            if (config==false) config = {};
            config["myelectric4"] = {
                "powerfeed": app_myelectric4.powerfeed,
                "dailyfeed": app_myelectric4.dailyfeed,
                "dailytype": app_myelectric4.dailytype,
                "unitcost": app_myelectric4.unitcost,
                "currency": app_myelectric4.currency
            };

            if (app_myelectric4.dailytype==0) app_myelectric4.escale = 0.001;
            if (app_myelectric4.dailytype==1) app_myelectric4.escale = 1.0;

            app_myelectric4.last_daytime = 0;
            app_myelectric4.last_startofweektime = 0;
            app_myelectric4.last_startofmonthtime = 0;
            app_myelectric4.last_startofyeartime = 0;

            app.setconfig(config);
            app_myelectric.reload = true;
            app_myelectric.reloadkwhd = true;
            
            app_myelectric.fastupdateinst = setInterval(app_myelectric.fastupdate,2000);
            app_myelectric.slowupdateinst = setInterval(app_myelectric.slowupdate,2000);

            // Switch to main view
            $("#myelectric_config").hide();
            $("#myelectric_body").show();
            app_myelectric4.fastupdate();
            app_myelectric4.slowupdate();
        });

        $("#myelectric_zoomout").click(function () {view.zoomout(); app_myelectric4.reload = true; app_myelectric4.autoupdate = false; app_myelectric4.fastupdate();});
        $("#myelectric_zoomin").click(function () {view.zoomin(); app_myelectric4.reload = true; app_myelectric4.autoupdate = false; app_myelectric4.fastupdate();});
        $('#myelectric_right').click(function () {view.panright(); app_myelectric4.reload = true; app_myelectric4.autoupdate = false; app_myelectric4.fastupdate();});
        $('#myelectric_left').click(function () {view.panleft(); app_myelectric4.reload = true; app_myelectric4.autoupdate = false; app_myelectric4.fastupdate();});

        $('.myelectric-time').click(function () {
            view.timewindow($(this).attr("time")/24.0);
            app_myelectric4.reload = true;
            app_myelectric4.autoupdate = true;
            app_myelectric4.fastupdate();
        });

        $(".myelectric-view-cost").click(function(){
            app_myelectric4.viewmode = "cost";
            console.log(app_myelectric4.viewmode);
            app_myelectric4.fastupdate();
            app_myelectric4.slowupdate();
        });

        $(".myelectric-view-kwh").click(function(){
            app_myelectric4.viewmode = "energy";
            console.log(app_myelectric4.viewmode);
            app_myelectric4.fastupdate();
            app_myelectric4.slowupdate();
        });
    },

    show: function()
    {
        $("body").css('background-color','#222');
        $(window).ready(function(){
            $("#footer").css('background-color','#181818');
            $("#footer").css('color','#999');
        });

        if (app_myelectric4.powerfeed>0 && app_myelectric4.dailyfeed>0) {

            // start of all time
            var meta = {};
            $.ajax({
                url: path+"feed/getmeta.json",
                data: "id="+app_myelectric4.dailyfeed+apikeystr,
                dataType: 'json',
                async: false,
                success: function(data_in) { meta = data_in; }
            });
            app_myelectric4.startalltime = meta.start_time;

            app_myelectric4.reloadkwhd = true;

            // resize and start updaters
            app_myelectric4.resize();


            app_myelectric4.fastupdateinst = setInterval(app_myelectric4.fastupdate,2000);
            app_myelectric4.fastupdate();
            app_myelectric4.slowupdateinst = setInterval(app_myelectric4.slowupdate,2000);
            app_myelectric4.slowupdate();
        }
    },

    resize: function()
    {
        var windowheight = $(window).height();

        bound = {};
        
        // var width = $("#myelectric_placeholder_bound_kwhd").width();
        // $("#myelectric_placeholder_kwhd").attr('width',width);
        // graph_bars.width = width;
        
        // var height = $("#myelectric_placeholder_bound_kwhd").height();
        // $("#myelectric_placeholder_kwhd").attr('height',height); 
        // graph_bars.height = height;
        
        var width = $("#myelectric_placeholder_bound_power").width();
        $("#myelectric_placeholder_power").attr('width',width);
        graph_lines.width = width;

        var height = $("#myelectric_placeholder_bound_power").height();
        $("#myelectric_placeholder_power").attr('height',height);
        graph_lines.height = height;


        if (width<=500) {
            $(".electric-title").css("font-size","16px");
            $(".power-value").css("font-size","38px");
            $(".power-value").css("padding-top","12px");
            $(".power-value").css("padding-bottom","8px");
            $(".midtext").css("font-size","14px");
            $(".units").hide();
            $(".visnav").css("padding-left","5px");
            $(".visnav").css("padding-right","5px");
        } else if (width<=724) {
            $(".electric-title").css("font-size","18px");
            $(".power-value").css("font-size","52px");
            $(".power-value").css("padding-top","22px");
            $(".power-value").css("padding-bottom","12px");
            $(".midtext").css("font-size","18px");
            $(".units").show();
            $(".visnav").css("padding-left","8px");
            $(".visnav").css("padding-right","8px");
        } else {
            $(".electric-title").css("font-size","22px");
            $(".power-value").css("font-size","85px");
            $(".power-value").css("padding-top","40px");
            $(".power-value").css("padding-bottom","20px");
            $(".midtext").css("font-size","20px");
            $(".units").show();
            $(".visnav").css("padding-left","8px");
            $(".visnav").css("padding-right","8px");
        }

        app_myelectric4.reloadkwhd = true;
        if (app_myelectric4.powerfeed && app_myelectric4.dailyfeed) {
            app_myelectric4.fastupdate();
            app_myelectric4.slowupdate();
        }
    },

    hide: function()
    {
        clearInterval(this.fastupdateinst);
        clearInterval(this.slowupdateinst);
    },

    fastupdate: function()
    {
        if (app_myelectric4.viewmode=="energy") {
            scale = 1;
            $("#myelectric_usetoday_units_a").html("");
            $("#myelectric_usetoday_units_b").html(" kWh");
            $(".u1a").html(""); $(".u1b").html("kWh");
            $(".u2a").html(""); $(".u2b").html(" kWh/d");
        } else {
            scale = app_myelectric4.unitcost;
            $("#myelectric_usetoday_units_a").html("&"+app_myelectric4.currency+";");
            $("#myelectric_usetoday_units_b").html("");
            $(".u1a").html("&"+app_myelectric4.currency+";"); $(".u1b").html("");
            $(".u2a").html("&"+app_myelectric4.currency+";"); $(".u2b").html("/day");
        }

        var now = new Date();
        var timenow = now.getTime();

        // --------------------------------------------------------------------------------------------------------
        // REALTIME POWER GRAPH
        // --------------------------------------------------------------------------------------------------------
        // Check if the updater ran in the last 60s if it did not the app was sleeping
        // and so the data needs a full reload.

        if ((timenow-app_myelectric4.lastupdate)>60000) app_myelectric4.reload = true;
        app_myelectric4.lastupdate = timenow;

        // reload power data
        if (app_myelectric4.reload) {
            app_myelectric4.reload = false;

            var timewindow = view.end - view.start;
            view.end = timenow;
            view.start = view.end - timewindow;

            var npoints = 1500;
            interval = Math.round(((view.end - view.start)/npoints)/1000);
            if (interval<1) interval = 1;

            view.start = 1000*Math.floor((view.start/1000)/interval)*interval;
            view.end = 1000*Math.ceil((view.end/1000)/interval)*interval;

            timeseries.load(app_myelectric4.powerfeed, view.start, view.end, interval);
        }

        // --------------------------------------------------------------------
        // 1) Get last value of feeds
        // --------------------------------------------------------------------
        var feeds = app_myelectric4.getfeedsbyid();
        app_myelectric4.feeds = feeds;

        // set the power now value
        if (app_myelectric4.viewmode=="energy") {
            $("#myelectric_powernow").html((feeds[app_myelectric4.powerfeed].value*1).toFixed(0)+"W");
            $("#myelectric_energy_r").html((feeds[app_myelectric4.energy_r].value*1).toFixed(0));
            $("#myelectric_energy_y").html((feeds[app_myelectric4.energy_y].value*1).toFixed(0));
            $("#myelectric_energy_b").html((feeds[app_myelectric4.energy_b].value*1).toFixed(0));            
            $("#myelectric_frequency").html((feeds[app_myelectric4.frequency].value*1).toFixed(0));     
            $("#myelectric_power_factor").html((feeds[app_myelectric4.power_factor].value*1).toFixed(0));     
            $("#myelectric_temperature").html((feeds[app_myelectric4.temperature].value*1).toFixed(0));     
            $("#myelectric_humidity").html((feeds[app_myelectric4.humidity].value*1).toFixed(0));     
        } else {
            $("#myelectric_powernow").html("&"+app_myelectric4.currency+";"+(feeds[app_myelectric4.powerfeed].value*1*app_myelectric4.unitcost*0.001).toFixed(2)+"/hr");
            $("#myelectric_energy_r").html((feeds[app_myelectric4.energy_r].value*1).toFixed(0));
            $("#myelectric_energy_y").html((feeds[app_myelectric4.energy_y].value*1).toFixed(0));
            $("#myelectric_energy_b").html((feeds[app_myelectric4.energy_b].value*1).toFixed(0));            
            $("#myelectric_frequency").html((feeds[app_myelectric4.frequency].value*1).toFixed(0));     
            $("#myelectric_power_factor").html((feeds[app_myelectric4.power_factor].value*1).toFixed(0));     
            $("#myelectric_temperature").html((feeds[app_myelectric4.temperature].value*1).toFixed(0));     
            $("#myelectric_humidity").html((feeds[app_myelectric4.humidity].value*1).toFixed(0));     
        }
        // Advance view
        if (app_myelectric4.autoupdate) {

            // move the view along
            var timerange = view.end - view.start;
            view.end = timenow;
            view.start = view.end - timerange;

            timeseries.append(
                app_myelectric4.powerfeed,
                feeds[app_myelectric4.powerfeed].time,
                feeds[app_myelectric4.powerfeed].value
            );

            // delete data that is now beyond the start of our view
            timeseries.trim_start(app_myelectric4.powerfeed,view.start*0.001);
        }

        // draw power graph
        var options = {
            axes: {
                color: "rgba(6,153,250,1.0)",
                font: "12px arial"
            },

            xaxis: {
                minor_tick: 60000*10,
                major_tick: 60000*60
            },

            yaxis: {
                title: "Power (Watts)",
                units: "W",
                minor_tick: 250,
                major_tick: 1000
            }
        };

        var timewindowhours = Math.round((view.end-view.start)/3600000);
        options.xaxis.major_tick = 30*24*3600*1000;
        if (timewindowhours<=24*7) options.xaxis.major_tick = 24*3600*1000;
        if (timewindowhours<=24) options.xaxis.major_tick = 2*3600*1000;
        if (timewindowhours<=12) options.xaxis.major_tick = 1*3600*1000;
        options.xaxis.minor_tick = options.xaxis.major_tick / 4;


        var series = {
            "solar": {
                color: "rgba(255,255,255,1.0)",
                data: []
            },
            "use": {
                //color: "rgba(6,153,250,0.5)", //BLUE - Original
                color: "rgba(255,255,25,0.8)",
                data: datastore[app_myelectric4.powerfeed].data
            }
        };

        graph_lines.draw("myelectric_placeholder_power",series,options);

    },

    slowupdate: function()
    {
    },

    getfeedsbyid: function()
    {
        var feeds = {};
        $.ajax({
            url: path+"feed/list.json"+apikeystr,
            dataType: 'json',
            async: false,
            success: function(data_in) { feeds = data_in; }
        });

        var byid = {};
        for (z in feeds) byid[feeds[z].id] = feeds[z];
        return byid;
    },

    getvalue: function(feedid,time)
    {
        var result = app_myelectric4.getdata({
          "id":feedid,
          "start":time,
          "end":time+1000,
          "interval":1
        });
        if (result.length==2) return result[0];
        return false;
    },

    getdata: function(args)
    {
        var reqstr = "";
        for (z in args) reqstr += "&"+z+"="+args[z];
        reqstr += apikeystr;
        console.log(reqstr);

        var data = [];
        $.ajax({
            url: path+"feed/data.json", data: reqstr,
            dataType: 'json', async: false,
            success: function(data_in) { data = data_in; }
        });
        return data;
    }
};
