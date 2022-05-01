const width = window.innerWidth * 0.7;
const height = window.innerHeight;

let projection = d3.geo.albers()
    .center([0, 55.4])
    .rotate([4.4, 0])
    .parallels([50, 60])
    .scale(1200 * 5)
    .translate([width / 2, height / 2]);

let path = d3.geo.path()
    .projection(projection)
    .pointRadius(2);

let zoom = d3.behavior.zoom()
    .on("zoom", function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
        svg.selectAll(".star-group").attr("transform", function (d) {
            return "translate(" + projection([d.lng, d.lat]) + ")" +
                " scale(" + (1.0 / zoom.scale()) + ")"
        })

        svg.selectAll(".circleStarGroup")
            .attr("transform", d => "translate(" + d.translate + ")" + " scale(" + (1 / zoom.scale()) + ")");
    });

let svg = d3.select("#canvas")
    .call(zoom)
    .append("g");

/// Converts a D3 file load into a promise
function loadData(loader, file) {
    return new Promise((resolve, reject) => {
        loader(file, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

function renderMap(maps, m, stars) {
    let promise = new Promise(x => x());

    for (const currentMap of maps) {
        promise = promise
            .then(() => loadData(d3.json, currentMap))
            .then(data => {
                const subunits = topojson.feature(data, data.objects.lad || data.objects.lgd);
                console.log("Rendering " + currentMap);

                svg.selectAll(".subunit_" + currentMap.split(".")[0])
                    .data(subunits.features)
                    .enter().append("path")
                    .attr("class", "map_region subunit_" + currentMap.split(".")[0])
                    .attr('id', (d) => d.id)
                    .attr("d", path)
                    .on("click", function (d, i) {
                        const sanitize = x => x === undefined || x === "" ? "<b><i>##</i></b>" : x;
                        d3.select("#region_name").html((m[d.id] && m[d.id]["Name"]) || "<b><i>Unknown</i></b>");
                        d3.select("#region_pop").html(sanitize(m[d.id] && m[d.id]["Population"]));
                        d3.select("#region_income").html(sanitize(m[d.id] && m[d.id]["Income"]));
                        d3.select("#region_housing").html(sanitize(m[d.id] && parseInt(m[d.id]["Housing"])));
                        d3.select("#region_stars").html(sanitize(m[d.id] && m[d.id]["Stars"]));
                        d3.select("#region_prediction").html(sanitize(m[d.id] && m[d.id]["Predicted_Stars"]));

                        const region_restaurants = d3.select("#region_restaurants").html("");

                        const restaurant_list = m[d.id] && m[d.id]["Restaurants"];
                        if (restaurant_list) {
                            const restaurants = eval(restaurant_list);
                            restaurants.sort((a, b) => stars.get(b).rating - stars.get(a).rating);

                            const elements = region_restaurants.selectAll("summary")
                                .data(restaurants)
                                .enter()
                                .append("li");

                            elements.html(d => d);
                            elements.append("span")
                                .html(d => "&#9733;".repeat(stars.get(d).rating))
                                .attr("class", "text-outline")
                                .style("color", "#FFD700");
                            elements.append("span")
                                .html(d => "&#9733;".repeat(3 - stars.get(d).rating))
                                .attr("class", "text-outline")
                                .style("color", "#2D2D2D");
                        }

                        svg.selectAll(".star-group").attr("style", "visibility:hidden;");
                        svg.selectAll(`.${d.id}`).attr("style", "")

                    });
            });
    }

    return promise;
}

function applyColorScheme(fn, clip = 0.0) {
    const validValues = svg.selectAll(".map_region").data().map(fn).filter(x => x !== undefined);

    // Clip off the extremes to give more variation in output
    validValues.sort((a, b) => a - b);
    const clipped = Math.floor(validValues.length * clip);
    const extent = [validValues[clipped], validValues[validValues.length - clipped - 1]];

    const color = d3.scale.linear().domain(extent).range(["#AABBCC", "#003355"]);
    svg.selectAll(".map_region").attr("fill", x => {
        const mapped = fn(x);
        if (mapped === undefined) return "#888888";
        else return color(mapped);
    });
}


loadData(d3.json, "joint.json")
    .then(joint => loadData(d3.csv, 'michellinData.csv').then(stars => [joint, stars]))
    .then(([joint, stars]) => {
        d3.selectAll(".color-select")[0].forEach(node => node.onclick = event => {
            event.preventDefault();
            // Apply changes to button classes
            d3.selectAll(".color-select").attr("class", "color-select");
            event.target.className = "color-select selected";

            const field = event.target.getAttribute("data-name");
            const clip = +(event.target.getAttribute("data-clip") || 0.0);

            applyColorScheme(d => joint[d.id] && joint[d.id][field], clip);
            return false;
        });

        const restaurant_map = new Map();
        for (const restaurant of stars) {
            restaurant_map.set(restaurant.name, restaurant);
        }

        return renderMap(["data.json", "ni.json", "scotland.json", "wales.json"], joint, restaurant_map)
            .then(() => applyColorScheme(d => joint[d.id] && joint[d.id]["Income"], 0.05))
            .then(() => stars);
    })
    .then(stars => loadData(d3.csv, 'joint.csv')
        .then(joint => [joint, stars]))
    .then(([joint, stars]) => {

        let star = d3.path();
        d3.symbolStar.draw(star, 2);

        const elemEnter = svg.selectAll("circle")
            .data(joint).enter()
            .append("g")
            .each(d => d.translate = path.centroid(d3.select(`#${d.Code}`).datum()))
            .attr("transform", d => "translate(" + d.translate + ")")
            .attr("class", "circleStarGroup");

        elemEnter.append("circle")
            .attr("fill", "#FFD700")
            .attr("r", 2)
            .attr("class", "circle")
            .attr("transform", d => "scale(" + Math.sqrt(Math.sqrt(16 * d.Stars)) + ")");

        elemEnter.append("path")
            .attr("class", "circleStar")
            .attr("stroke", "#FFEA70")
            .attr("d", star)
            .attr('id', d => d.Name)
            .attr("transform", d => "scale(" + Math.sqrt(Math.sqrt(4 * d.Stars)) + ")");

        elemEnter.append("text")
            .attr("dx", d => Math.sqrt(Math.sqrt(d.Stars)) * -3)
            .attr("dy", 5)
            .attr("class", "circleText")
            .attr("transform", "scale(0.6)")
            .text(d => d.Stars > 0 ? d.Stars : undefined);

        const restaurant_regions = new Map();
        for (const region of joint) {
            if (region["Restaurants"]) {
                eval(region["Restaurants"]).forEach(x => restaurant_regions.set(x, region.Code));
            }
        }

        const starGroup = svg.selectAll("points")
            .data(stars)
            .enter()
            .append("g")
            .each(d => d.region = restaurant_regions.get(d.name))
            .attr("class", d => `star-group ${d.region}`)
            .attr("style", "visibility:hidden;")
            .attr("transform", d => "translate(" + projection([d.lng, d.lat]) + ")");

        starGroup.append("path")
            .attr("class", d => `star ${restaurant_regions.get(d.name)}`)
            .attr("stroke", "#FFD700")
            .attr("d", star)
            .attr("transform", d => "scale(" + Math.sqrt(10 * d.rating) + ")")
            .each(d => d.region = restaurant_regions.get(d.name));

        starGroup.append("text")
            .attr("dx", -4)
            .attr("dy", 5)
            .attr("class", d => `starText ${d.Code}`)
            .attr("transform", d => "scale(" + Math.sqrt(0.4 * d.rating) + ")")
            .text(d => d.rating);
    });