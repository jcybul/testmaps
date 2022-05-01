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
        svg.selectAll(".star").attr("transform", function (d) {
            return "translate(" + projection([d.lng, d.lat]) + ")" +
                " scale(" + (Math.sqrt(4 * d.rating) / zoom.scale()) + ")"
        });
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

function renderMap(maps, m) {
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
                        document.getElementById("region_name").innerHTML = m[d.id] && m[d.id]["Name"];
                        document.getElementById("region_pop").innerHTML = m[d.id] && m[d.id]["Population"];
                        document.getElementById("region_income").innerHTML = m[d.id] && m[d.id]["Income"];
                        document.getElementById("region_housing").innerHTML = m[d.id] && m[d.id]["Housing"];
                        document.getElementById("region_stars").innerHTML = m[d.id] && m[d.id]["Stars"];

                        const restaurant_list = m[d.id] && m[d.id]["Restaurants"];
                        if (restaurant_list) {
                            const restaurants = eval(restaurant_list);
                            console.log(restaurants);

                            const elements = d3.select("#region_restaurants")
                                .html("")
                                .selectAll("summary")
                                .data(restaurants)
                                .enter()
                                .append("li");

                            elements.html(d => d);
                            elements.append("span")
                                .html("&#9733;&#9733;&#9733;")
                                .attr("class", "text-outline")
                                .style("color", "#FFD700");
                        }
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
    .then(joint => {
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

        return renderMap(["data.json", "ni.json", "scotland.json", "wales.json"], joint)
            .then(() => applyColorScheme(d => joint[d.id] && joint[d.id]["weighted"], 0.05));
    })
    .then(() => loadData(d3.csv, 'michellinData.csv'))
    .then(data => {
        let star = d3.path();
        d3.symbolStar.draw(star, 2);

        svg.selectAll("points")
            .data(data)
            .enter()
            .append("path")
            .attr("class", "star")
            .attr("stroke", "#FFD700")
            .attr("d", star)
            .attr("transform", function (d) {
                return "translate(" + projection([d.lng, d.lat]) + ")" +
                    "scale(" + (Math.sqrt(4 * d.rating) / zoom.scale()) + ")"
            });
    });