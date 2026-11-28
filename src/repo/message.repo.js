import { messageModel } from "../database/models/message.model.js";
import createRepository from "../repo/index.js";

const messageRepo = createRepository(messageModel);

export default messageRepo
