import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import docsRouter from "./routes/docs.js";
import { socketAuth } from "./middleware/socketAuth.js";
import { registerDocHandlers } from "./sockets/docHandlers.js";


dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 1e6, // 1MB limit
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/docs", docsRouter);



io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  registerDocHandlers(io, socket);

  socket.on("disconnect", (reason) => {
    console.log("Client disconnected:", socket.id, reason);
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
