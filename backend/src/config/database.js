const mongoose = require('mongoose');

const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
};

const buildAtlasDirectUri = (uri) => {
  const source = new URL(uri);
  const query = new URLSearchParams(source.search);

  // Lista de nós do cluster Discordovisk. Evita uma consulta DNS SRV que
  // alguns provedores bloqueiam ou deixam expirar.
  const seedHosts = [
    'ac-hrhpgx0-shard-00-00.qttcarp.mongodb.net:27017',
    'ac-hrhpgx0-shard-00-01.qttcarp.mongodb.net:27017',
    'ac-hrhpgx0-shard-00-02.qttcarp.mongodb.net:27017',
  ].join(',');

  query.set('authSource', 'admin');
  query.set('replicaSet', 'atlas-38uryx-shard-0');
  query.set('tls', 'true');

  return `mongodb://${source.username}:${source.password}@${seedHosts}${source.pathname}?${query.toString()}`;
};

/**
 * Conecta ao banco de dados MongoDB
 * O MongoDB é um banco NoSQL que armazena dados em formato JSON-like
 */
const connectDB = async () => {
  try {
    const usesAtlasSrv = process.env.MONGODB_URI?.startsWith('mongodb+srv://');
    const targetUri = usesAtlasSrv
      ? buildAtlasDirectUri(process.env.MONGODB_URI)
      : process.env.MONGODB_URI;

    if (usesAtlasSrv) {
      console.log('ℹ️ Conectando diretamente aos nós do MongoDB Atlas.');
    }

    const conn = await mongoose.connect(targetUri, connectionOptions);
    
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
