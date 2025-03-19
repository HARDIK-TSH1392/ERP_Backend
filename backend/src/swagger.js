const swaggerJsDoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0", // Use OpenAPI version
        info: {
            title: "API Documentation", // Title of your API
            version: "1.0.0", // Version of your API
            description: "This is the API documentation for our project.", // Description
        },
        servers: [
            {
                url: "http://localhost:3000", // API base URL
            },
        ],
    },
    apis: ["./routes/*.js"], // Path to the files containing your endpoints
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;