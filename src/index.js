import * as cheerio from "cheerio";
import { Client, Intents, MessageEmbed } from "discord.js";
import "dotenv/config";
import fetch from "node-fetch";

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
const cmd = "!cs";
var schedules = [];

//Cheerio Scraper
//@params: void
//return: JSON Object (Movies)
export async function scrapeAllMovies() {
  const res = await fetch(
    "https://www.uci-kinowelt.de/coming-soon#!#scroll-to-the-program-please"
  );

  const body = await res.text();
  const $ = cheerio.load(body);
  const movies = $(".slide-content"); //Returns Cheerio Object Collection with all the children
  const mappedMovies = [];

  //@params: i: int = index; movie: HTML Node
  movies.each((i, movie) => {
    mappedMovies[i] = {
      title: $(movie).children().first().first().text().trim(),
      releaseDate: $(movie).children().first().siblings("h4").text().trim(),
      available: !$(movie).children().toString().includes("inactive"),
    };
  });
  return mappedMovies;
}

//ON READY
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

//ON MESSAGE
client.on("messageCreate", (message) => {
  //PREVENTIVE CHECKS
  if (message.author.bot) return;
  if (!message.content.startsWith(`${cmd} `)) return;
  const sentence = message.content.substr(4).trim(); //Movie Search keyword
  if (sentence === "") return;

  //CLEAR SCHEDULES COMMAND
  if (sentence === "csclear") {
    schedules.forEach((s) => {
      clearInterval(s);
    });
    message.channel.send("Stopped");
    return;
  }

  //LIST ALL MOVIES COMMAND
  if (sentence === "csall") {
    scrapeAllMovies().then((allMovies) => {
      allMovies.forEach((movie) => {
        message.channel.send("`" + movie.title + "`");
      });
    });
  }

  //HELP COMMAND
  if (sentence === "help") {
    message.channel.send({
      embeds: [
        new MessageEmbed()
          .setTitle("Commands")
          .addField(
            "Get scheduled updates on movie availability",
            "!cs <movie name> (<movie2 name>...)\ne.g. !cs Fight Club Black Panther..."
          )
          .addField("Clear all scheduled tasks", "!cs csclear")
          .addField("Get all movies", "!cs csall"),
      ],
    });
  }

  console.log(`Sentence is: ${sentence.toUpperCase()}`);
  const timer = 1000 * 3600; //in ms (factor 2: 3600 for 1h)

  scrapeAllMovies().then((allMovies) => {
    allMovies.forEach((movie) => {
      if (sentence.toUpperCase().includes(movie.title.toUpperCase())) {
        console.log(`Found movie: ${movie.title}`);
        const embed = new MessageEmbed()
          .setTitle(movie.title)
          .setDescription(movie.releaseDate);

        if (movie.available) {
          embed.addField("Tickets Status: ", "`AVAILABLE`", true);
        } else {
          embed.addField("Tickets Status: ", "Not available...", true);
        }
        console.log("SENDING");
        message.channel.send({ embeds: [embed] });
        // clearInterval(schedule);
        schedules = [];
        var s = setInterval(() => {
          console.log("SENDING");
          message.channel.send({ embeds: [embed] });
        }, timer);
        schedules.push(s);
      }
    });
  });
});

//ON UNCAUGHT ERROR
process.on("uncaughtException", (err) => {
  console.error(err);
  if (!process.env.BOT_OWNER_ID) {
    throw Error("missing bot owner id");
  }
  client.users.cache
    .get(process.env.BOT_OWNER_ID)
    ?.send("I fucking died.\nError: " + err)
    .then(() => process.exit(1))
    .catch(() => console.log("Message failed to send to Bot owner"));
});

client.login(process.env.TOKEN);
