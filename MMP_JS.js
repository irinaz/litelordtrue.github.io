// d3js library for mapping militant groups from json data  (sample url https://dev-mapping-militants.pantheonsite.io/data/map-profiles/23)
// this dataviz displays data for each group and allows user to filter data via controls in the left sidebar
// first we define functions, then we draw/update chart in <div id="main_timeline" class="main_timeline"> using function updateChart
// class objects are defined in class_definitions.js, this file is called in index.html


// hide/show groups/events/other objects with class "classname" on the map
function handleCheckbox(classname, checkboxname) {
  let checkBox = document.getElementById(checkboxname);
  var entityList = d3.selectAll("." + classname);

  if (checkBox.checked == false){
    entityList.classed("hide", true);
  } else {
    entityList.classed("hide", false);
  }
}
//

// outputting dates nicely
function yearToDate(year){
  return parseTime(year + "-01-01");
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function DateToNice(date){
  year = date.getFullYear();
  month = months[date.getMonth()];
  day = date.getDate();
  return (month + " " + day + ", " + year);
}
//


// tools to handle timeline resolution 
resolutionDict = 
  [{
    value: "0",
    text: "5 Years",
    height: .2
  },
  {
    value: "1",
    text: "1 Year",
    height: 1
  },
  {
    value: "2",
    text: "6 Months",
    height: 2
  },
  {
    value: "3",
    text: "1 Quarter",
    height: 4
  }]

function handleSliderInput(){
  let slider = document.getElementById("zoomRange");
  let span = document.getElementById("resolutionText");
  let resolution = resolutionDict[slider.value];
  span.innerText = resolution.text;
  handleResolutionChange(resolution.height);
}

function handleResetInput(){
  ResetPan();
}

function handleDomainInput(){
  let input_box = document.getElementById("domainInput");
  let input = input_box.value;
  let year_array = input.split(",");
  let new_min = yearToDate(year_array[0]);
  let new_max = yearToDate(year_array[1]);

  handleDomainChange(new_min, new_max);
  input_box.placeholder = input; // sets "grey" text in background
}
//

// zooming
function ResetPan(){
  zoom.transform(svg, d3.zoomIdentity);
}

function handleResolutionChange(ratio){
  h = ratio * default_height;
  tScale.range([padding, h-padding]);
  params_obj.set('ratio', ratio); // set ratio in search params
  handleURLManip();
  updateChart();
}

function handleDomainChange(min, max){ // this works but sort of messes up things. stuff to iron out
  tScale.domain([min, max]);
  params_obj.set('domain', [min.getFullYear(), max.getFullYear()]); // set domain in search params as years
  handleURLManip();
  updateChart();
}
//

// functions to save parameters from URL (based on user search) in url_obj

function handleURLManip(){
  url_obj.search = params_obj; // this sets the search in the url object to what we modified in our parameter object
  history.replaceState(null, '', url_obj.pathname + url_obj.search); // this just changes the url without actually loading it
}


// functions for user interaction for mmp_groups
function handleMMPGroupMouseOver (group_data) {
  let group_g = document.getElementById(group_data.id);
  let group_rect = group_g.children[0]; // this is sort of cheaty, but it works
  d3.select(group_rect).style("opacity", .9).style("fill", "mediumslateblue");

  // this generates an array of the line elements that connect to this group. 
  let link_obj_list = [];
  for (link_num = 0; link_num < group_data.links.length; link_num++){
    link_obj_list.push(document.getElementById(group_data.links[link_num]));
  }
  // console.log(link_obj_list);
  
};

function handleMMPGroupMouseOut (group_data) {
  let group_g = document.getElementById(group_data.id);
  let group_rect = group_g.children[0]; // this is sort of cheaty, but it works
  d3.select(group_rect).style("opacity", .7).style("fill", "ghostwhite");
}; 
//

// function for clicking for more info
function handleClick(type, id){
  var clicked_data, clicked_type, name, description, date;

  // handle event click
  if (type === "event") {
    clicked_data = processed_data.events.find(element => element.id === id);
    clicked_type = clicked_data.type;
    name = clicked_data.name;
    description = clicked_data.description;
    date = clicked_data.date;
  }
  // handle group click
  else if (type === "mmpgroup") {
    clicked_data = processed_data.mmp_groups.find(element => element.id === id);
    clicked_type = "mmpgroup";
    name = clicked_data.name;
    description = clicked_data.description;
    date = clicked_data.startdate;
    
  }
  // handle relationship click
  else if (type === "relationship") {
    relationship_dict = {spl: "Split", all: "Allies", riv: "Rivals"};
    clicked_data = processed_data.relationships.find(element => element.id === id);
    clicked_type = "relationship";
    group1_data = processed_data.mmp_groups.find(element => element.id === clicked_data.group1);
    group2_data = processed_data.mmp_groups.find(element => element.id === clicked_data.group2);
    name = "" + group1_data.abbr + " and " + group2_data.abbr + " " + relationship_dict[clicked_data.relationship_type];
    description = clicked_data.description;
    date = clicked_data.date;
  }

  // grab divs to put information in
  const modal = document.getElementById('infoModal');
  const name_span = document.getElementById('infoModalLabel');
  const date_span = document.getElementById('date_span');
  const description_span = document.getElementById('description_span');

  name_span.innerText = name;
  date_span.innerText = DateToNice(date);

  description_span.innerText = description;

  /* description_box.setAttribute("class", clicked_type + "_description");

  params_obj.set('click', [type, id]);
  handleURLManip();

  // console.log(document.getElementById('#' + id));
  svg.selectAll('.clicked').classed('clicked', false); */
}


// this function draws everything in
function updateChart(){
  d3.select('#main_g').remove(); // delete the entire g
  var main_g = svg.append('g').attr("id", "main_g"); // recreate it

  var tAxis = d3.axisLeft(tScale).ticks(Math.ceil(h/svg_h)*12); //so there is ~12 ticks in the svg at any point

  main_g.append("g")
  .attr("class", "axis")
  .attr("transform", "translate(" + padding + ",0)") // something needs to be done about this, some words are getting cut off
  .call(tAxis);

  zoom.translateExtent([[0,0], [w,h]]); // making sure you can only translate within bounds


  var rectWidth = w/(processed_data.mmp_groups.length + 1);
  var rectHeight = 100; // should probably scale these...


  // fixing y and x for mmp_groups
  for (i = 0; i < processed_data.mmp_groups.length; i++){
    let mmpgroup = processed_data.mmp_groups[i];
    mmpgroup.updatePos(rectHeight);
  };


  // make mmpgroup g element to append rectangle and text
  var mmp_groups = main_g.selectAll("mmpgroup")
  .data(processed_data.mmp_groups)
  .enter()
  .append("g")
  .attr("class", function(d){
    if (!d.active){return "mmpgroup inactive"}
    else if (d.active){return "mmpgroup active"}
    else {return "mmpgroup"};
  })
  .attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"}) // transform instead of using x/y
  .attr("id", function(d){ return d.id})
  .attr("width", rectWidth)
  .attr("height", rectHeight);

  // make mmpgroup rectangles
  var mmpgroupRect = mmp_groups
  .data(processed_data.mmp_groups)
  .append("rect")
  .attr("x", -rectWidth/2)
  .attr("y", -rectHeight/2)
  .attr("width", rectWidth)
  .attr("height", rectHeight)
  .attr("rx", rectWidth/20)
  .attr("data-bs-toggle", "modal") 
  .attr("data-bs-target", "#infoModal")
  .on("mouseover", function(d,i){handleMMPGroupMouseOver(i)}) // passing all group data into these functions. should be more efficient?
  .on("mouseout", function(d,i){handleMMPGroupMouseOut(i)})
  .on("click", function(d,i){handleClick("mmpgroup", i.id)});

  var mmpgroupText = mmp_groups
  .data(processed_data.mmp_groups)
  .append("text")
  .text(function(d){return d.abbr})
  .attr("y", -rectHeight/4)
  .attr("dominant-baseline", "middle")
  .attr("text-anchor", "middle");

  var mmpgroupVLines = mmp_groups
  .data(processed_data.mmp_groups)
  .append("line")
  .attr("x1", 0)
  .attr("y1", rectHeight/2)
  .attr("x2", 0)
  .attr("y2", function(d){return h - d.y}) // since the origin is the actual mmpgroup position!
  .attr("class", "timeline")
  .attr("id", function(d) {return d.id + "_timeline"});
  // mmp_groups set up!

  // fixing event position
  for (i = 0; i < processed_data.events.length; i++){
      let event = processed_data.events[i];
      event.updatePos();
  };


  // drawing events
  /* for (i = 0; i < processed_data.mmp_groups.length; i++){ // why not do this when constructing the dataset? it makes to store array of events within the objects
    mmpgroup = processed_data.mmp_groups[i];
    event_list = processed_data.events.filter(element => element.parent_id === mmpgroup.id);
  }; */

  var events = main_g.selectAll("event") // want these 
  .data(processed_data.events)
  .enter()
  .append("circle")
  .attr("class", function(d) {return d.type})
  .attr("cx", function(d) {return d.x})
  .attr("cy", function(d) {return d.y})
  .attr("id", function(d) {return d.id})
  .attr("r", 6)
  .attr("data-bs-toggle", "modal") 
  .attr("data-bs-target", "#infoModal")
  .on("click", function(d, i){
    handleClick("event", i.id)
  });



  // fixing y and x position for relationships

  for (i=0; i<processed_data.relationships.length; i++){
      let relationship = processed_data.relationships[i];
      relationship.updatePos();
  }

  // drawing in relationships
  var relationships = main_g.selectAll("relationship")
  .data(processed_data.relationships).enter()
  .append("g")
  .attr("class", function(d){return d.relationship_type})
  .attr("transform", function(d) {return "translate(" + d.x1 + "," + d.y + ")"})
  .attr("width", function(d){return d.x2 - d.x1;})
  .attr("id", function(d){return d.id;});

  // relationship lines
  relationships.data(processed_data.relationships)
  .append("line")
  .attr("x1", 0)
  .attr("x2", function(d) {return d.x2 - d.x1;})
  .attr("y1", 0)
  .attr("y2", 0);

  // relationship endpoint circles
  // first circle
  relationships.data(processed_data.relationships)
  .append("circle")
  .attr("cx", 0)
  .attr("cy", 0)
  .attr("r", 2.5)
  // second circle
  relationships.data(processed_data.relationships)
  .append("circle")
  .attr("cx", function(d){return d.x2 - d.x1})
  .attr("cy", 0)
  .attr("r", 2.5);

  // relationship clickable circles
  relationships.data(processed_data.relationships)
  .append("circle")
  .attr("cx", function(d){return .5*(d.x2-d.x1);})
  .attr("cy", 0)
  .attr("r", 5)
  .attr("data-bs-toggle", "modal") 
  .attr("data-bs-target", "#infoModal")
  .on("click", function(d, i){
    handleClick("relationship", i.id)
  });

}
//

// function that initializes webpage

const url_obj = new URL(document.URL); // makes a url object
const params_obj = new URLSearchParams(url_obj.search);

var ratio_param = params_obj.get('ratio'); // split into individual variables
if (ratio_param){
    ratio_param = parseFloat(ratio_param);
    let slider = document.getElementById("zoomRange");
    let span = document.getElementById("resolutionText");
    let resolution = resolutionDict.find(element => element.height === ratio_param);
    slider.value = resolution.value;
    span.innerText = resolution.text;
}
else{ratio_param = 1};
var domain_param = params_obj.get('domain'); // ''
// if (domain_param){domain_param = domain_param.split(',')};
// var click_param = params_obj.get('click'); // ''
// moving the div over to replicate real webpage, still not great because its absolute positioning :
var width_ratio = .7;

var working_div = document.getElementById("main_timeline");

// setting up a workspace
var w = width_ratio * window.screen.width;
var svg_h = 1500;
const default_height = svg_h;
var h = ratio_param * default_height; // this no longer sets the height of the svg, but rather the height of the elements within it!
var padding = 50;
var radius = 15;

var svg = d3.select("#main_timeline").append("svg").attr("id", "svg")
.attr("height", svg_h).attr("width", w)
.attr("style", "outline: thin solid red");

var main_g = svg.append('g').attr("id", "main_g");

function handleZoom(e) {
    d3.select('#main_g').attr("transform", e.transform);
}

let zoom = d3.zoom()
.on('zoom', handleZoom)
.scaleExtent([1,1]) // disables zoom
.translateExtent([[0,0], [w,h]]); // keeps panning within bounds

d3.select('svg').call(zoom);


var todays_date = new Date();
var todays_year = todays_date.getFullYear();
var parseTime = d3.timeParse("%Y-%m-%d");

// creating the (currently) empty dataset
var processed_data = {
    mmp_groups: [],
    events: [],
    relationships: [],
};

function handleD3JSONRead(input_data){
  // reading groups and attacks
  for (i=0; i<input_data.mmp_groups.length; i++){
    let group = input_data.mmp_groups[i].mmp_group;
    processed_data.mmp_groups.push(new mmp_group(
      group.group_id, group.group_name, "abbr", parseTime(group.startdate), parseTime(group.enddate), group.active, 
      0, 0, 
      group.description, []
    ))
  }

  /* reading relationships
  for (i=0; i<data.links.length; i++){
      let relationship = data.links[i].Link;
      processed_data.relationships.push(new relationship_class(
          relationship.type, relationship.id, parseTime(relationship.date), relationship.description,
          relationship.group1, relationship.group2, 
          0, 0, 0
      ));

      // creating a list of connected groups for tracing
      let group1 = processed_data.mmp_groups.find(element => element.id === relationship.group1);
      let group2 = processed_data.mmp_groups.find(element => element.id === relationship.group2);
      group1.links.push(relationship.id);
      group2.links.push(relationship.id);
  } */
}


function handlePageInit(datasource){
  d3.json(datasource)
  .then(function(data){
    handleD3JSONRead(data);

    // finding the minimum year
    var date_min = d3.min(processed_data.mmp_groups, function(d){
        return d.startdate;
    })

    let year_min = date_min.getFullYear();

    // setting up the domain input textbox
    let domainInput = document.getElementById('domainInput');
    let defDomainValue = year_min + "," + todays_year;
    var initDomainValue;
    if (domain_param){initDomainValue = domain_param}
    else {initDomainValue = defDomainValue};

    domainInput.value = initDomainValue;
    domainInput.placeholder = initDomainValue;

    initDomainArray = initDomainValue.split(',');
    for (i=0; i<2; i++){initDomainArray[i] = yearToDate(initDomainArray[i])};

    // initiate time scale
    tScale = d3.scaleTime().domain(initDomainArray).range([padding, h-padding]);

    // giving reset domain button its function

    function handleDomainReset(){
        handleDomainChange(date_min, todays_date);
        domainInput.value = defDomainValue;
        domainInput.placeholder = defDomainValue;
    }

    document.getElementById('domainReset').onclick = handleDomainReset;

    updateChart();

    /* if there was a click in url, we need to have it clicked
    if (click_param){
        click_array = click_param.split(',');
        handleClick(click_array[0], click_array[1]);
    }; */
  })
}
