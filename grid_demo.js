var grid_demo = {
  // static attributes
  domGrid: null,
  domContainer: null,
  domTarget: null,
  columns: [],
  rows: [],
  cellWidth: 0,
  cellHeight: 0,
  numX: 10,
  numY: 13,
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  numBoxes: 0,

  /**
   * Get coordinates that reside within the grid
   * -
   *
   * @param double coord
   * @param boolean isX
   *
   * @return double
   */
  get_valid_midpoint: function(coord, isX){
    var min = isX ? this.minX : this.minY;
    var max = isX ? this.maxX : this.maxY;
    var values = isX ? this.columns : this.rows;
    if(coord > max)
      var valid =  max;
    else if(coord < min)
      var valid =  min;
    else
      var valid = coord;
    return values[this.get_nearest_coord(valid, isX)];
  },

  /**
   * Handle mouse down events
   *
   * @param event
   */
  start_new_box: function(event){
    event.preventDefault();

    // increment box count (mainly for color styling)
    grid_demo.numBoxes++;
    var colorClass = 'bg_' + (grid_demo.numBoxes % 4);

    var click_x = grid_demo.get_valid_midpoint(event.pageX, true);
    var click_y = grid_demo.get_valid_midpoint(event.pageY, false);

    var domNew = $('<div></div>')
      .addClass('layout_item')
      .addClass(colorClass)
      .css({
        'top': grid_demo.get_edge_from_midpoint(click_y, false, true),
        'left': grid_demo.get_edge_from_midpoint(click_x, true, true),
        'width': grid_demo.cellWidth,
        'height': grid_demo.cellHeight,
      });
    domNew.appendTo(grid_demo.domContainer);

    /**
     * Attach mousemove listener for the duration of the drag event
     */
    grid_demo.domContainer.on('mousemove', function(event){
      var move_x = grid_demo.get_valid_midpoint(event.pageX, true);
      var move_y = grid_demo.get_valid_midpoint(event.pageY, false);

      if(move_x < click_x){
        var neX = move_x;
        var swX = click_x;
      }
      else{
        var neX = click_x;
        var swX = move_x;
      }
      if(move_y < click_y){
        var neY = move_y;
        var swY = click_y;
      }
      else{
        var neY = click_y;
        var swY = move_y;
      }

      // get the all corner coords point
      neX = grid_demo.get_edge_from_midpoint(neX, true, true);
      neY = grid_demo.get_edge_from_midpoint(neY, false, true);
      swX = grid_demo.get_edge_from_midpoint(swX, true, false);
      swY = grid_demo.get_edge_from_midpoint(swY, false, false);

      // calc width and height from corners
      var width = swX - neX;
      var height = swY - neY;

      domNew.css({
        'width': width,
        'height': height,
        'top': neY,
        'left': neX,
      });
    });

    /**
     * Function finishes creation of the box and cleans up any
     * event listeners we no longer need
     */
    var finish_new_box = function(event){
      grid_demo.domContainer.off('mousemove');
      grid_demo.domContainer.off('mouseup');
      grid_demo.domContainer.off('mouseleave');

      // create the mirror box to display the code
      var domCodeBox = domNew.clone();
      var objPosition = domNew.position();
      var objGridPosition = grid_demo.domContainer.position();
      var objTargetPosition = grid_demo.domTarget.position();
      var offsetPadding = 16;

      domCodeBox.css({
        'top': objPosition.top - objGridPosition.top + objTargetPosition.top,
        'left': objPosition.left - objGridPosition.left + objTargetPosition.left,
        'width': domNew.width() - offsetPadding,
        'height': domNew.height() - offsetPadding
      }).removeClass('layout_item').addClass('layout_code');
      domCodeBox.appendTo(grid_demo.domTarget);

      // get the code text itself
      var code = grid_demo.get_rmq_code(domNew);
      domCodeBox.text(code).attr('title', code);

      // clicked and timer are here to handle double click events
      domCodeBox.data({'clicked': false, 'timer': null, 'sister': domNew});
      domCodeBox.on('click', dispatch_codebox_clicks);
    };

    /**
     * Monitor clicks on a codebox and dispatch separate click / dblclick events
     */
    var dispatch_codebox_clicks = function(){
      var element = $(this);
      var isClicked = element.data('clicked');

      // double click successful
      if(isClicked){
        // clear out double click logic
        clearTimeout(element.data('timer'));
        element.data({'timer': null, 'clicked': false});

        console.log('double clicked');
        //delete_box(element);
      }

      // single click
      else{
        element.data({
          'clicked':  true,
          'timer': setTimeout(function(){
            element.data('clicked', false);
            console.log('single clicked');
          }, 250)
        });
      }
      return false;
    }

    /**
     * Releasing mouse triggers completion of new box
     */
    grid_demo.domContainer.on('mouseup', finish_new_box);

    /**
     * If the mouse leaves the outer container, we will stop
     * creation of the box at the final coordinates
     */
    grid_demo.domContainer.on('mouseleave', finish_new_box);

  },

  /**
   * Generate rmq code for building a box on the grid
   *
   * @param domBox
   *
   * @return string
   */
  get_rmq_code: function(domBox){
    var start = this.get_nearest_midpoint(domBox, true);
    var end = this.get_nearest_midpoint(domBox, false);
    return 'st.frame = \'' + start + ':' + end + '\'';
  },

  /**
   * Get the coordinates of the nearest grid point
   *
   * @param domBox
   * @param isLeft
   *
   * @return string gridpoint
   */
  get_nearest_midpoint: function(domBox, isLeft){
    var position = domBox.position();
    var testpoint = {};
    if(isLeft){
      testpoint.x = position.left;
      testpoint.y = position.top;
    }
    else{
      testpoint.x = position.left + domBox.width();
      testpoint.y = position.top + domBox.height();
    }

    var column = this.num_to_alpha(this.get_nearest_coord(testpoint.x, true));
    var row = this.get_nearest_coord(testpoint.y, false);

    return column + '' + row;
  },

  /**
   * Function gets the nearest row or column to a point
   *
   * @param float coord
   * @param boolean isX
   *
   * @return int
   */
  get_nearest_coord: function(coord, isX){
    var midpoints = isX ? this.columns : this.rows;
    var numUnit = isX ? this.numX : this.numY;
    var closest = 0;
    var distance = 9999;
    for(var i = 0; i < numUnit; i++){
      var temp = Math.abs(midpoints[i] - coord);
      if(temp < distance){
        closest = i;
        distance = temp;
      }
    }
    return closest;
  },


  /**
   * Given a midpoint, find the relevant grid box edge
   *
   * @param midpoint
   * @param isX
   * @param isNE
   */
  get_edge_from_midpoint: function(midpoint, isX, isNE){
    var dimension = isX ? this.cellWidth : this.cellHeight;

    // since we're in the midpoint, we only add/subtract half
    dimension = dimension / 2;

    return isNE ? midpoint - dimension : midpoint + dimension;
  },

  /**
   * Convert numeric column (starting at 0) to alpha column name
   * - only built for lowercase a-z right now
   *
   * @param int
   *
   * @return char
   */
  num_to_alpha: function(x){
     return String.fromCharCode(97 + x);
  },

  /**
   * Build the grid html
   *
   * @return domGrid
   */
  build_grid: function(){

    // table header
    var domTable = $('<table></table>').addClass('grid_builder');
    var domThead = $('<thead></thead>');
    var domHeadRow = $('<tr></tr>');

    // empty cell for the y axis labels
    $('<td></td>').appendTo(domHeadRow);

    // x axis labels
    for(var i = 0; i < this.numX; i++)
      $('<td></td>').addClass('grid_label').text(this.num_to_alpha(i))
        .appendTo(domHeadRow);
    domHeadRow.appendTo(domThead);
    domThead.appendTo(domTable);

    // table body
    var domTbody = $('<tbody></tbody>');
    for(var i = 0; i < this.numY; i++){
       var domRow = $('<tr></tr>');
       $('<td></td>').addClass('grid_label').text(i).appendTo(domRow);
       for(var j = 0; j< this.numX; j++)
         $('<td></td>').addClass('grid_cell')
           .text(this.num_to_alpha(j) + i)
           .appendTo(domRow);
       domRow.appendTo(domTbody);
    }
    domTbody.appendTo(domTable);

    domTable.appendTo(this.domContainer);
    return domTable;
  },

  /**
   * Function initializes the grid demo
   *
   * @param domContainer
   * @param domGrid
   */
  init_grid: function(domContainer, domGrid, domTargetContainer){
    this.domContainer = domContainer;
    this.domTarget = domTargetContainer;

    this.domGrid = this.build_grid(this.domContainer);

    // set grid size restrictions
    var domFirstCell = this.domGrid.find('.grid_cell').first();
    this.cellWidth = domFirstCell.outerWidth() -
      parseInt(domFirstCell.css('border-left-width')) / 2 -
      parseInt(domFirstCell.css('border-right-width')) / 2;
    this.cellHeight = domFirstCell.outerHeight() -
      parseInt(domFirstCell.css('border-top-width')) / 2 -
      parseInt(domFirstCell.css('border-bottom-width')) / 2;

    // these help handle calculations getting thrown off by collapsed borders
    var borderOffsetX = parseInt(domFirstCell.css('border-left-width')) / 2;
    var borderOffsetY = parseInt(domFirstCell.css('border-top-width')) / 2;

    // store grid midpoints to use in code creation
    var domFirstCell = this.domGrid.find('.grid_cell').first();
    var width = domFirstCell.outerWidth();
    var midX = width / 2;
    var offsetX = domFirstCell.position().left + borderOffsetX;;
    var height = domFirstCell.outerHeight();
    var offsetY = domFirstCell.position().top + borderOffsetY;
    var midY = domFirstCell.height() / 2;
    for(var i = 0; i < this.numX; i++)
      this.columns.push(width * i + midX + offsetX - borderOffsetX);
    for(var i = 0; i < this.numY; i++)
      this.rows.push(height * i + midY + offsetY + borderOffsetY);

    // min / max values for easy access
    this.minX = this.columns[0];
    this.minY = this.rows[0];
    this.maxX = this.columns[this.columns.length-1];
    this.maxY = this.rows[this.rows.length-1];

    // start listeners
    this.domContainer.mousedown(this.start_new_box);
  }
}

$(document).ready(function(){
  grid_demo.init_grid($('#demo_grid'), $('.grid_builder').first(), $('#demo_code'));
  $(document).tooltip();
});

