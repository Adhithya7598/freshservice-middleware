const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const WEATHER_API_KEY = "b9134ec1a26662e25cb517e35635d1f5";
const FRESHSERVICE_API_KEY = "FMC2m_atZtBHMGdQ_ILN";
const FRESHSERVICE_DOMAIN = "haass-io507.freshservice.com";

function generateRecommendation(weather, tripType) {
  const temp = Math.round(weather.main.temp - 273.15);
  const description = weather.weather[0].description.toLowerCase();
  const humidity = weather.main.humidity;
  const windSpeed = weather.wind.speed;
  const city = weather.name;

  let weatherSummary = "";
  let advice = "";

  if (temp >= 30) {
    weatherSummary = `Hot weather expected in ${city} (${temp}°C)`;
    advice += "Stay hydrated and avoid long outdoor walks during peak hours. ";
  } else if (temp >= 20) {
    weatherSummary = `Pleasant weather in ${city} (${temp}°C)`;
    advice += "Great conditions for outdoor activities. ";
  } else if (temp >= 10) {
    weatherSummary = `Mild weather in ${city} (${temp}°C)`;
    advice += "Carry a light jacket for comfort. ";
  } else {
    weatherSummary = `Cold weather in ${city} (${temp}°C)`;
    advice += "Bundle up with warm clothing. ";
  }

  if (description.includes("rain") || description.includes("drizzle")) {
    advice += "High chance of rain — carry an umbrella. ";
  } else if (description.includes("storm")) {
    advice += "Stormy conditions — stay indoors. ";
  } else if (description.includes("clear")) {
    advice += "Clear skies — perfect for sightseeing! ";
  } else if (description.includes("cloud")) {
    advice += "Cloudy but good for travel. ";
  }

  if (tripType === "Vacation")
    advice += "Enjoy your vacation!";
  else if (tripType === "Business")
    advice += "Allow extra travel time.";
  else if (tripType === "Adventure")
    advice += "Check trail conditions.";

  return `${weatherSummary}\n\nTravel Recommendation: ${advice}\n\nWeather Details: ${description}, Humidity: ${humidity}%, Wind: ${windSpeed} m/s`;
}

async function postComment(ticketId, comment) {
  console.log("Posting comment to Freshservice Ticket:", ticketId);

  const url = `https://${FRESHSERVICE_DOMAIN}/api/v2/tickets/${ticketId}/notes`;
  const auth = Buffer.from(`${FRESHSERVICE_API_KEY}:X`).toString("base64");

  const response = await axios.post(
    url,
    {
      body: comment,
      private: false,
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log("Freshservice Response:", response.status);

  return response.data;
}

app.post("/recommend", async (req, res) => {

  console.log("=================================");
  console.log("Webhook Received");
  console.log("Body:", req.body);
  console.log("=================================");

  const { ticket_id, city, trip_type } = req.body;

  if (!ticket_id || !city) {
    console.log("Missing ticket_id or city");
    return res.status(400).json({
      error: "Missing ticket_id or city",
    });
  }

  try {

    console.log("Fetching weather for:", city);

    const weatherUrl =
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}`;

    const weatherResponse = await axios.get(weatherUrl);

    console.log("Weather API Success");

    const recommendation = generateRecommendation(
      weatherResponse.data,
      trip_type || "Vacation"
    );

    console.log("Generated Recommendation");
    console.log(recommendation);

    await postComment(ticket_id, recommendation);

    console.log("Comment posted successfully!");

    res.json({
      success: true,
      recommendation,
    });

  } catch (error) {

    console.log("========== ERROR ==========");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Data:", error.response.data);
    } else {
      console.log(error.message);
    }

    console.log("===========================");

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "Weather Travel Middleware is running!"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
