'use strict';

/**
 * @ngdoc service
 * @name polestar.Pills
 * @description
 * # Pills
 * Service in the polestar.
 */
angular.module('polestar')
  .service('Pills', function (consts, vl, Spec, _, $window, Schema, Prov) {
    function instantiate() {
      return {};
    }

    var Pills = {
      pills: {}
    };

    Pills.getSchemaPill = function(fieldDef) {
      return {
        field: fieldDef.field,
        type: fieldDef.type,
        aggregate: fieldDef.aggregate
      };
    };

    Spec.updateProvListeners.push(function(data){
      console.log("data", data);
      updateFieldDef(data.spec.encoding, {}, data.channel);
    });

    /** copy value from the pill to the fieldDef */

    function updateFieldDef(encoding, pill, channel){
      console.log("updateFieldDef");
      console.log(arguments);
      var type = pill.type,
        supportedRole = vl.channel.getSupportedRole(channel),
        dimensionOnly = supportedRole.dimension && !supportedRole.measure;

      // auto cast binning / time binning for dimension only encoding type.
      if (pill.field && dimensionOnly) {
        if (pill.aggregate==='count') {
          pill = {};
          $window.alert('COUNT not supported here!');
        } else if (type === vl.type.QUANTITATIVE && !pill.bin) {
          pill.aggregate = undefined;
          pill.bin = {maxbins: vl.bin.MAXBINS_DEFAULT};
        } else if(type === vl.type.TEMPORAL && !pill.timeUnit) {
          pill.timeUnit = consts.defaultTimeFn;
        }
      } else if (!pill.field) {
        // no name, it's actually the emp
        // y shelf that
        // got processed in the opposite direction
        pill = {};
      }

      // filter unsupported properties
      var base = instantiate(channel),
        shelfProps = Schema.getChannelSchema(channel).properties;

      for (var prop in shelfProps) {
        if (pill[prop]) {
          if (prop==='value' && pill.field) {
            // only copy value if name is not defined
            // (which should never be the case)
            delete base[prop];
          } else {
            //FXIME In some case this should be merge / recursive merge instead ?
            base[prop] = pill[prop];
          }
        }
      }
      encoding[channel] = base;
    }

    Pills.remove = function (channel) {
      // Prov.removePill(channel, _.clone(Pills.pills[channel]));
      delete Pills.pills[channel];
      updateFieldDef(Spec.spec.encoding, {}, channel); // remove all pill detail from the fieldDef
    };

    Pills.update = function (channel) {
      console.log("Update");
      updateFieldDef(Spec.spec.encoding, Pills.pills[channel], channel);
    };

    Pills.dragStart = function (pill, channel) {
      Pills.pills.dragging = pill;
      Pills.pills.etDragFrom = channel;
    };

    Pills.dragStop = function () {
      delete Pills.pills.dragging;
    };

    Pills.dragDrop = function (etDragTo) {


      // Get Encoding and Drag From
      var encoding = _.clone(Spec.spec.encoding),
        etDragFrom = Pills.pills.etDragFrom;

      // update the clone of the encoding
      // console.log('dragDrop', encoding, Pills, 'from:', etDragFrom, Pills.pills[etDragFrom]);
      if(etDragFrom){
        // if pill is dragged from another shelf, not the schemalist
        //
        // console.log('pillDragFrom', Pills.pills[etDragFrom]);
        updateFieldDef(encoding, Pills.pills[etDragFrom] || {}, etDragFrom);
      }
      updateFieldDef(encoding, Pills.pills[etDragTo] || {}, etDragTo);

      // Finally, update the encoding only once to prevent glitches
      Spec.spec.encoding = encoding;

      // Add to Provenance
      if(etDragFrom){ // Moving
        Prov.movePill(etDragFrom, etDragTo, encoding[etDragTo]);
      } else { // Newly Added
        Prov.addPill(etDragTo, encoding[etDragTo]);
      }

      // console.log('Pills.dragDrop',
      //   'from:', etDragFrom, Pills.pills[etDragFrom], encoding[etDragFrom],
      //   'to:', etDragTo, Pills.pills[etDragTo], encoding[etDragTo]);


      etDragFrom = null;
    };




    return Pills;
  });
