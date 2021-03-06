'use strict';

TABS.power = {
    supported: false,
};

TABS.power.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'power') {
        GUI.active_tab = 'power';
        // Disabled on merge into betaflight-configurator
        //googleAnalytics.sendAppView('Power');
    }

    function load_status() {
        MSP.send_message(MSPCodes.MSP_STATUS, false, false, load_voltage_meters);
    }

    function load_voltage_meters() {
        MSP.send_message(MSPCodes.MSP_VOLTAGE_METERS, false, false, load_current_meters);
    }

    function load_current_meters() {
        MSP.send_message(MSPCodes.MSP_CURRENT_METERS, false, false, load_current_meter_configs);
    }
    
    function load_current_meter_configs() {
        MSP.send_message(MSPCodes.MSP_CURRENT_METER_CONFIG, false, false, load_voltage_meter_configs);
    }

    function load_voltage_meter_configs() {
        MSP.send_message(MSPCodes.MSP_VOLTAGE_METER_CONFIG, false, false, load_battery_state);
    }

    function load_battery_state() {
        MSP.send_message(MSPCodes.MSP_BATTERY_STATE, false, false, load_battery_config);
    }
    
    function load_battery_config() {
        MSP.send_message(MSPCodes.MSP_BATTERY_CONFIG, false, false, load_html);
    }

    function load_html() {
        $('#content').load("./tabs/power.html", process_html);
    }
    
    this.supported = semver.gte(CONFIG.apiVersion, "1.33.0");

    if (!this.supported) {
        load_html();
    } else {
        load_status();
    }

    function update_ui() {
        if (!TABS.power.supported) {
            $(".tab-power").removeClass("supported");
            return;
        }
        $(".tab-power").addClass("supported");

        // voltage meters
        
        var template = $('#tab-power-templates .voltage-meters .voltage-meter');
        var destination = $('.tab-power .voltage-meters'); 
        
        for (var index = 0; index < VOLTAGE_METERS.length; index++) {
            var meterElement = template.clone();
            $(meterElement).attr('id', 'voltage-meter-' + index);
            
            var message = chrome.i18n.getMessage('powerVoltageId' + VOLTAGE_METERS[index].id);
            $(meterElement).find('.label').text(message)
            destination.append(meterElement);
        }
        
        var template = $('#tab-power-templates .voltage-configuration');
        for (var index = 0; index < VOLTAGE_METER_CONFIGS.length; index++) {
            var destination = $('#voltage-meter-' + index + ' .configuration');
            var element = template.clone();
            
            var attributeNames = ["vbatscale", "vbatresdivval", "vbatresdivmultiplier"]; 
            for (let attributeName of attributeNames) {
                $(element).find('input[name="' + attributeName + '"]').attr('name', attributeName + '-' + index);
            }
            destination.append(element);
            
            $('input[name="vbatscale-' + index + '"]').val(VOLTAGE_METER_CONFIGS[index].vbatscale).attr('disabled','disabled');
            $('input[name="vbatresdivval-' + index + '"]').val(VOLTAGE_METER_CONFIGS[index].vbatresdivval).attr('disabled','disabled');
            $('input[name="vbatresdivmultiplier-' + index + '"]').val(VOLTAGE_METER_CONFIGS[index].vbatresdivmultiplier).attr('disabled','disabled');
        }

        // amperage meters

        var template = $('#tab-power-templates .amperage-meters .amperage-meter');
        var destination = $('.tab-power .amperage-meters'); 
        
        for (var index = 0; index < CURRENT_METERS.length; index++) {
            var meterElement = template.clone();
            $(meterElement).attr('id', 'amperage-meter-' + index);
            
            var message = chrome.i18n.getMessage('powerAmperageId' + CURRENT_METERS[index].id);
            $(meterElement).find('.label').text(message)
            destination.append(meterElement);
        }
        
        var template = $('#tab-power-templates .amperage-configuration');
        for (var index = 0; index < CURRENT_METER_CONFIGS.length; index++) {
            var destination = $('#amperage-meter-' + index + ' .configuration');
            var element = template.clone();
            
            var attributeNames = ["amperagescale", "amperageoffset"]; 
            for (let attributeName of attributeNames) {
                $(element).find('input[name="' + attributeName + '"]').attr('name', attributeName + '-' + index);
            }
            destination.append(element);
            
            $('input[name="amperagescale-' + index + '"]').val(CURRENT_METER_CONFIGS[index].scale).attr('disabled','disabled');
            $('input[name="amperageoffset-' + index + '"]').val(CURRENT_METER_CONFIGS[index].offset).attr('disabled','disabled');
        }
        
        
        // battery
        
        var template = $('#tab-power-templates .battery-states .battery-state');
        var destination = $('.tab-power .battery-state');
        var element = template.clone();
        $(element).find('.connection-state').attr('id', 'battery-connection-state');
        $(element).find('.voltage').attr('id', 'battery-voltage');
        $(element).find('.mah-drawn').attr('id', 'battery-mah-drawn');
        $(element).find('.amperage').attr('id', 'battery-amperage');
            
        destination.append(element.children());

        var template = $('#tab-power-templates .battery-configuration');
        var destination = $('.tab-power .battery .configuration');
        var element = template.clone();
        destination.append(element);
            
        $('input[name="mincellvoltage"]').val(BATTERY_CONFIG.vbatmincellvoltage);
        $('input[name="maxcellvoltage"]').val(BATTERY_CONFIG.vbatmaxcellvoltage);
        $('input[name="warningcellvoltage"]').val(BATTERY_CONFIG.vbatwarningcellvoltage);
        $('input[name="capacity"]').val(BATTERY_CONFIG.capacity);

        var haveFc = (semver.lt(CONFIG.apiVersion, "1.35.0") || (CONFIG.boardType == 0 || CONFIG.boardType == 2));
        
        var batteryMeterTypes = [
            'None',
            'Onboard ADC',
        ];
        
        if (haveFc) {
            batteryMeterTypes.push('ESC Sensor');
        }

        var batteryMeterType_e = $('select.batterymetersource');
        for (var i = 0; i < batteryMeterTypes.length; i++) {
            batteryMeterType_e.append('<option value="' + i + '">' + batteryMeterTypes[i] + '</option>');
        }

        batteryMeterType_e.change(function () {
            BATTERY_CONFIG.voltageMeterSource = parseInt($(this).val());
        });
        batteryMeterType_e.val(BATTERY_CONFIG.voltageMeterSource).change();

        // fill current
        var currentMeterTypes = [
            'None',
            'Onboard ADC',
        ];

        if (haveFc) {
            currentMeterTypes.push('Virtual');
            currentMeterTypes.push('ESC Sensor');
        }

        var currentMeterType_e = $('select.currentmetersource');
        for (var i = 0; i < currentMeterTypes.length; i++) {
            currentMeterType_e.append('<option value="' + i + '">' + currentMeterTypes[i] + '</option>');
        }

        currentMeterType_e.change(function () {
            BATTERY_CONFIG.currentMeterSource = parseInt($(this).val());
        });
        currentMeterType_e.val(BATTERY_CONFIG.currentMeterSource).change();

        
        
        function get_slow_data() {
            MSP.send_message(MSPCodes.MSP_VOLTAGE_METERS, false, false, function () {
                for (var i = 0; i < VOLTAGE_METERS.length; i++) {
                    var elementName = '#voltage-meter-' + i + ' .value';
                    var element = $(elementName);
                    element.text(chrome.i18n.getMessage('powerVoltageValue', [VOLTAGE_METERS[i].voltage]));
                }
            });

            MSP.send_message(MSPCodes.MSP_CURRENT_METERS, false, false, function () {
                for (var i = 0; i < CURRENT_METERS.length; i++) {
                    var elementName = '#amperage-meter-' + i + ' .value';
                    var element = $(elementName);
                    element.text(chrome.i18n.getMessage('powerAmperageValue', [CURRENT_METERS[i].amperage.toFixed(2)]));
                }
            });
            
            MSP.send_message(MSPCodes.MSP_BATTERY_STATE, false, false, function () {
                var elementPrefix = '#battery';
                var element;
                    
                element = $(elementPrefix + '-connection-state .value');
                element.text(BATTERY_STATE.cellCount > 0 ? chrome.i18n.getMessage('powerBatteryConnectedValueYes', [BATTERY_STATE.cellCount]) : chrome.i18n.getMessage('powerBatteryConnectedValueNo'));
                element = $(elementPrefix + '-voltage .value');
                element.text(chrome.i18n.getMessage('powerVoltageValue', [BATTERY_STATE.voltage]));
                element = $(elementPrefix + '-mah-drawn .value');
                element.text(chrome.i18n.getMessage('powerMahValue', [BATTERY_STATE.mAhDrawn]));
                element = $(elementPrefix + '-amperage .value');
                element.text(chrome.i18n.getMessage('powerAmperageValue', [BATTERY_STATE.amperage]));
            });

        }
        
        $('a.save').click(function () {
        
            /* FIXME update for api 1.33.0
            for (var index = 0; index < VOLTAGE_METER_CONFIGS.length; index++) {
                VOLTAGE_METER_CONFIGS[index].vbatscale = parseInt($('input[name="vbatscale-' + index + '"]').val());
                VOLTAGE_METER_CONFIGS[index].vbatresdivval = parseInt($('input[name="vbatresdivval-' + index + '"]').val());
                VOLTAGE_METER_CONFIGS[index].vbatresdivmultiplier = parseInt($('input[name="vbatresdivmultiplier-' + index + '"]').val());
            }
            
            for (var index = 0; index < CURRENT_METER_CONFIGS.length; index++) {
                CURRENT_METER_CONFIGS[index].scale = parseInt($('input[name="amperagescale-' + index + '"]').val());
                CURRENT_METER_CONFIGS[index].offset = parseInt($('input[name="amperageoffset-' + index + '"]').val());
            }
            */
                
            BATTERY_CONFIG.vbatmincellvoltage = parseFloat($('input[name="mincellvoltage"]').val());
            BATTERY_CONFIG.vbatmaxcellvoltage = parseFloat($('input[name="maxcellvoltage"]').val());
            BATTERY_CONFIG.vbatwarningcellvoltage = parseFloat($('input[name="warningcellvoltage"]').val());
            BATTERY_CONFIG.capacity = parseInt($('input[name="capacity"]').val());

            /* FIXME update for api 1.33.0
            function save_voltage_config() {
                MSP.sendVoltageMeterConfigs(save_amperage_config);
            }

            function save_amperage_config() {
                MSP.sendAmperageMeterConfigs(save_battery_config);
            }
            */

            function save_battery_config() {
                MSP.send_message(MSPCodes.MSP_SET_BATTERY_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_BATTERY_CONFIG), false, save_to_eeprom);
            }
            
            function save_to_eeprom() {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, save_completed);
            }

            function save_completed() {
                GUI.log(chrome.i18n.getMessage('configurationEepromSaved'));

                TABS.power.initialize();
            }

            save_battery_config();
        });

        GUI.interval_add('setup_data_pull_slow', get_slow_data, 200, true); // 5hz
    }
    
    function process_html() {
        update_ui();
        
        // translate to user-selected language
        localize();
        
        GUI.content_ready(callback);
    }
};

TABS.power.cleanup = function (callback) {
    if (callback) callback();
};
