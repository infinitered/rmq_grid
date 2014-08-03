var grid_demo = {

  // html elements to bind grid to
  domGrid: null,
  domContainer: null,
  domTarget: null,

  // user settable values
  num_columns: 10,
  num_rows: 13,
  column_gutter: 10,
  row_gutter: 10,
  content_left_margin: 0,
  content_right_margin: 0,
  content_top_margin: 0,
  content_bottom_margin: 0,

  // class will set these values automatically
  // don't mess with them
  columns: [],
  rows: [],
  cellWidth: 0,
  cellHeight: 0,
  cell_padding: 10,
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
   * Set the background image of the grids to user upload
   *
   * @param input
   */
  set_bg_image: function(input){
    if(input.files && input.files[0]){
      var reader = new FileReader();
      reader.onload = function(event){
        var file = event.target.result;
        if(file.match(/^data:image\//)){
          $('.grid_container').css('background-image', 'url(' + event.target.result + ')');
          $('#bg_image_controls').css('display', 'block');
        }
      }
      reader.readAsDataURL(input.files[0]);
    }
  },

  /**
   * Set some dimension of the background images
   *
   * @param dimension
   * @param value
   */
  set_bg_dimension: function(dimension, value){
    if(dimension == 'top' || dimension == 'left'){
      var css_dimension = 'background-position';
      value += 'px';
    }
    else{
      var css_dimension = 'background-size';
      value += '%';
    }
    var old = $('.grid_container').css(css_dimension).split(' ');

    if(dimension == 'left' || dimension == 'width')
        old[0] = value;
    else
        old[1] = value;

    $('.grid_container').css(css_dimension, old.join(' '));
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

        // don't forget to clear annoying browser text selection
        if(window.getSelection){
            if(window.getSelection().empty)
              window.getSelection().empty();
            else if(window.getSelection().removeAllRanges)
              window.getSelection.removeAllRanges();
        }
        else if(document.selection)
            document.selection.empty();

        delete_box(element);
      }

      // single click
      else{
        element.data({
          'clicked':  true,
          'timer': setTimeout(function(){
            element.data('clicked', false);
            attempt_delete(element);
          }, 250)
        });
      }
      return false;
    }

    /**
     * Delete with confirmation prompt
     * 
     * @param domElement
     */
    var attempt_delete = function(element){
      $( "#dialog-confirm" ).dialog({
      resizable: false,
      height: 260,
      modal: true,
      buttons: {
        "Yes": function() {
          delete_box(element);
          $( this ).dialog( "close" );
        },
        Cancel: function() {
          $( this ).dialog( "close" );
        }
      }
      }).html("<p>Are you sure you would like to remove <em>" + element[0].innerHTML + "</em>?</p>");
    };

    /**
     * Remove a box and its sister element
     *
     * @param domBox
     */
    var delete_box = function(domBox){
      var domSister = domBox.data('sister'); 
      if(domSister)
        domSister.fadeOut();
      domBox.fadeOut();
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
    var numUnit = isX ? this.num_columns : this.num_rows;
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
    var domGrid = $('<div></div>').addClass('grid_builder');
    var domHeadRow = $('<div></div>');

    // empty cell for the y axis labels
    $('<div></div>')
      .addClass('grid_label grid_label_corner')
      .css({
        'margin-right': this.content_left_margin, 
        'margin-bottom': this.content_top_margin
      })
      .appendTo(domHeadRow);

    // x axis labels
    for(var i = 0; i < this.num_columns; i++)
      $('<div></div>')
        .addClass('grid_label grid_label_top')
        .text(this.num_to_alpha(i))
        .css({
          'width': this.cellWidth, 
          'margin-right': this.column_gutter,
          'margin-bottom': this.content_top_margin
        })
        .appendTo(domHeadRow);
    domHeadRow.appendTo(domGrid);

    // table body
    for(var i = 0; i < this.num_rows; i++){
      var domRow = $('<div></div>')
        .css({'margin-bottom': this.row_gutter, 'height': this.cellHeight});
      $('<div></div>')
        .addClass('grid_label grid_label_left')
        .css({'margin-right': this.content_left_margin})
        .text(i).appendTo(domRow);
      for(var j = 0; j< this.num_columns; j++)
        $('<div></div>').addClass('grid_cell')
          .css({
            'width': this.cellWidth, 
            'padding-top': this.cell_padding,
            'margin-right': this.column_gutter
          })
          .text(this.num_to_alpha(j) + i)
          .appendTo(domRow);
      domRow.appendTo(domGrid);
    }

    domGrid.appendTo(this.domContainer);
    return domGrid;
  },

  /**
   * Set the top cell padding to vertically center cell text
   */
  setCellPadding: function(){
    var font_size = 14;
    this.cell_padding = this.cellHeight / 2 - font_size / 2;
    if(this.cell_padding < 0)
        this.cell_padding = 0;
  },

  /**
   * Set demo_grid dimension if exists in dimension object
   *
   * @param name
   * @param dimensions
   */
  setDimension: function(name, dimensions){
    if(dimensions.hasOwnProperty(name))
      this[name] = parseInt(dimensions[name]);
  },

  /**
   * Set the column related parameters
   *
   * @param dimensiosn
   */
  setColumns: function(dimensions){
    this.setDimension('num_columns', dimensions);
    this.setDimension('column_gutter', dimensions);
    this.setDimension('content_left_margin', dimensions);
    this.setDimension('content_right_margin', dimensions);
    
    var container_width = this.domContainer.width() - 20 // label row width
      - this.content_left_margin - this.content_right_margin; 
    this.cellWidth = container_width / this.num_columns - this.column_gutter;
  },

  /**
   * Set the row related parameters
   *
   * @param dimensiosn
   */
  setRows: function(dimensions){
    this.setDimension('num_rows', dimensions);
    this.setDimension('row_gutter', dimensions);
    this.setDimension('content_top_margin', dimensions);
    this.setDimension('content_bottom_margin', dimensions);
    
    var container_height = this.domContainer.height() - 20 // label row width
      - this.content_top_margin - this.content_bottom_margin;
    this.cellHeight = container_height / this.num_rows - this.row_gutter;

    // vertically center text
    this.setCellPadding();
  },

  /**
   * Function initializes the grid demo
   *
   * @param domContainer
   * @param domTargetContainer
   * @param dimensions
   */
  init_grid: function(domContainer, domTargetContainer, dimensions){
    this.domContainer = domContainer;
    this.domTarget = domTargetContainer;
    if(!dimensions)
      dimensions = {}

    // set grid dimensions
    this.setColumns(dimensions);
    this.setRows(dimensions);
    
    // build the grid
    this.domGrid = this.build_grid(this.domContainer);

    // store grid midpoints to use in position calculations
    var midX = this.cellWidth / 2;
    var midY = this.cellHeight / 2;
    var label_offset = 20; // height / width of the label rows
    var offsetX = this.domContainer.position().left + label_offset +
      this.content_left_margin + parseInt(this.domContainer.css('padding-left'));
    var offsetY = this.domContainer.position().top + label_offset + 
      this.content_top_margin + parseInt(this.domContainer.css('padding-top'));
    for(var i = 0; i < this.num_columns; i++)
      this.columns.push((this.cellWidth + this.column_gutter) * i + midX + offsetX);
    for(var i = 0; i < this.num_rows; i++)
      this.rows.push((this.cellHeight + this.row_gutter) * i + midY + offsetY);

    // min / max values for easy access
    this.minX = this.columns[0];
    this.minY = this.rows[0];
    this.maxX = this.columns[this.columns.length-1];
    this.maxY = this.rows[this.rows.length-1];

    // start listeners
    this.domContainer.mousedown(this.start_new_box);
    $('#bg_upload').on('change', function(){
      grid_demo.set_bg_image(this);
    });
    $('.bg_dimension').on('change', function(){
      grid_demo.set_bg_dimension(this.id.split('_')[1], this.value);
    });
  }
}

$(document).ready(function(){
  var dimensions = {
    num_columns: 10,
    num_rows: 22,
    column_gutter: 2,
    row_gutter: 2,
    content_left_margin: 40,
    content_right_margin: 40,
    content_top_margin: 40,
    content_bottom_margin: 40
  }
  grid_demo.init_grid($('#demo_grid'), $('#demo_code'), dimensions);
  $(document).tooltip();
});

