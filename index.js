const TelegramBot=require("node-telegram-bot-api"),express=require("express"),path=require("path");
const admin=require("firebase-admin");
const TOKEN=process.env.BOT_TOKEN,CHANNEL_URL=process.env.CHANNEL_URL||"https://t.me/",ADMIN_PASSWORD=process.env.ADMIN_PASSWORD,PORT=process.env.PORT||3000;
if(!TOKEN||!ADMIN_PASSWORD) process.exit(console.error("BOT_TOKEN and ADMIN_PASSWORD are required."));
admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),databaseURL:"https://ln-apk-downold-default-rtdb.firebaseio.com/"});
const db=admin.database(),bot=new TelegramBot(TOKEN,{polling:true});
const app=express();app.use(express.json());app.use(express.static(path.join(__dirname,"public")));
async function apks(){let s=await db.ref("apks").once("value");let v=s.val()||{};return Object.entries(v).map(([id,x])=>({id,...x}));}
function keyboard(a){let rows=a.map(x=>[{text:"📥 "+x.name,callback_data:"apk_"+x.id}]);rows.push([{text:"📢 JOIN CHANNEL",url:CHANNEL_URL}]);return{inline_keyboard:rows};}
bot.onText(/^\/start$/,async m=>{await db.ref("users/"+m.from.id).set({id:m.from.id,first_name:m.from.first_name||"",username:m.from.username||"",last_seen:new Date().toISOString()});let a=await apks();bot.sendMessage(m.chat.id,a.length?`👋 আসসালামু আলাইকুম ${m.from.first_name||"বন্ধু"}!\n\n🎉 স্বাগতম LN CLUB DOWNLOAD BOT-এ!\n\n📱 আপনার প্রয়োজনীয় APK নির্বাচন করুন:`:"👋 স্বাগতম LN CLUB DOWNLOAD BOT-এ!\n\nবর্তমানে কোনো APK যোগ করা হয়নি।",{reply_markup:{inline_keyboard:a.length?keyboard(a).inline_keyboard:[[{text:"📢 JOIN CHANNEL",url:CHANNEL_URL}]]}})});
bot.on("callback_query",async q=>{if(q.data==="back"){let a=await apks();await bot.answerCallbackQuery(q.id);return bot.editMessageText("📱 APK নির্বাচন করুন:",{chat_id:q.message.chat.id,message_id:q.message.message_id,reply_markup:keyboard(a)})}if(!q.data.startsWith("apk_"))return;let a=(await apks()).find(x=>x.id===q.data.slice(4));if(!a)return bot.answerCallbackQuery(q.id,{text:"APK পাওয়া যায়নি।",show_alert:true});await bot.answerCallbackQuery(q.id);bot.sendMessage(q.message.chat.id,`📱 ${a.name}\n\n${a.description||""}\n\n👇 Download করতে নিচের বাটনে চাপুন।`,{reply_markup:{inline_keyboard:[[{text:"📥 DOWNLOAD APK",url:a.url}],[{text:"🔙 APK LIST",callback_data:"back"}]]}})});
function auth(req,res,next){if(req.path==="/login")return next();if(req.headers["x-admin-token"]!==ADMIN_PASSWORD)return res.status(401).json({error:"Unauthorized"});next()}
app.post("/api/login",(q,r)=>q.body.password===ADMIN_PASSWORD?r.json({token:ADMIN_PASSWORD}):r.status(401).json({error:"Wrong password"}));
app.use("/api",auth);
app.get("/api/apks",async(q,r)=>r.json(await apks()));
app.post("/api/apks",async(q,r)=>{let{name,url,description}=q.body;if(!name||!url)return r.status(400).json({error:"Name and URL required"});let ref=db.ref("apks").push();let x={name:String(name).trim(),url:String(url).trim(),description:String(description||"").trim(),created_at:new Date().toISOString()};await ref.set(x);r.json({id:ref.key,...x})});
app.delete("/api/apks/:id",async(q,r)=>{await db.ref("apks/"+q.params.id).remove();r.json({success:true})});
app.get("/api/stats",async(q,r)=>{let a=await db.ref("apks").once("value"),u=await db.ref("users").once("value");r.json({apks:a.numChildren(),users:u.numChildren()})});
app.listen(PORT,()=>console.log("LN CLUB Firebase bot running on "+PORT));