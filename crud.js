const path = require("path");
const os = require("os");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const DB_PATH = path.join(getScriptFolder(), "mpvremote", "remote.db");
const fs = require("fs");

let db;

function NotFoundException(message) {
  this.message = message || "Object not found";
  this.name = "NotFoundException";
}

function getMPVHome() {
  let mpvHome;

  if (os.platform() === "win32") {
    mpvHome =
      process.env["MPV_HOME"] ||
      path.join(os.homedir(), "AppData", "Roaming", "mpv");
  } else {
    mpvHome = process.env["MPV_HOME"];
    if (!mpvHome) {
      const xdgConfigHome =
        process.env["XDG_CONFIG_HOME"] || `${os.homedir()}/.config`;
      mpvHome = path.join(xdgConfigHome, "mpv");
    }
  }
  return mpvHome;
}

// Get scripts folder
function getScriptFolder() {
  
  return path.join(getMPVHome(), "scripts");
}

async function init_tables() {
  // Collections
  // TYPE Can be: Movies - 1, TVShows - 2, Music - 3
  await db.exec(
    `CREATE TABLE IF NOT EXISTS collection(
        id INTEGER PRIMARY KEY ASC, name TEXT NOT NULL, type INTEGER NOT NULL
      )`
  );

  // Collection entry
  await db.exec(
    `CREATE TABLE IF NOT EXISTS collection_entry(
        id INTEGER PRIMARY KEY ASC,
        collection_id INTEGER NOT NULL,
        path TEXT NOT NULL,
        CONSTRAINT fk_collection
          FOREIGN KEY (collection_id)
          REFERENCES collection(id)
          ON DELETE CASCADE
      )`
  );

  // Media status
  await db.exec(
    `CREATE TABLE IF NOT EXISTS mediastatus(
        id INTEGER PRIMARY KEY ASC,
        directory TEXT,
        file_name TEXT NOT NULL,
        current_time REAL,
        finished INTEGER,
        favorited INTEGER DEFAULT 0
      )`
  );

  // Migration: Add favorited column if it doesn't exist
  try {
    const tableInfo = await db.all("PRAGMA table_info(mediastatus)");
    const hasFavoritedColumn = tableInfo.some(col => col.name === 'favorited');

    if (!hasFavoritedColumn) {
      await db.exec("ALTER TABLE mediastatus ADD COLUMN favorited INTEGER DEFAULT 0");
      console.log("Added favorited column to mediastatus table");
    }
  } catch (exc) {
    console.log("Migration check/execution error:", exc);
  }

  // Saved playlists
  await db.exec(
    `CREATE TABLE IF NOT EXISTS saved_playlist(
        id INTEGER PRIMARY KEY ASC,
        name TEXT NOT NULL,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
  );

  // Saved playlist entries
  await db.exec(
    `CREATE TABLE IF NOT EXISTS saved_playlist_entry(
        id INTEGER PRIMARY KEY ASC,
        playlist_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        position INTEGER NOT NULL,
        CONSTRAINT fk_saved_playlist
          FOREIGN KEY (playlist_id)
          REFERENCES saved_playlist(id)
          ON DELETE CASCADE
      )`
  );
}

async function initDB() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  await db.get("PRAGMA foreign_keys=on;");
  await init_tables();
}

async function getMediastatusEntries(filepath = null, directory = null) {
  /*
    filepath: Gets entry for a single file path
    directory: Gets entries for a directory
  */
  try {
    if (filepath != null) {
      // If last char is path.sep remove it
      if (filepath[filepath.length - 1] == path.sep)
        filepath = filepath.slice(0, -1);
      let spl = filepath.split(path.sep);
      const fileName = spl[spl.length - 1];
      spl.pop();

      const directory = spl.join(path.sep);
      return await db.get(
        "SELECT * FROM mediastatus WHERE directory=? AND file_name=? ORDER BY file_name",
        [directory, fileName]
      );
    } else if (directory != null) {
      // directory = directory.split(path.sep);
      if (directory[directory.length - 1] == path.sep)
        directory = directory.slice(0, -1);
      const entries = await db.all(
        "SELECT * FROM mediastatus WHERE directory=? ORDER BY file_name",
        [directory]
      );
      return entries;
    } else {
      return await db.all("SELECT * FROM mediastatus");
    }
  } catch (exc) {
    console.log(exc);
  }
}

async function createMediaStatusEntry(filepath, time, finished) {
  try {
    const statusEntry = await getMediastatusEntries(filepath);

    let spl = filepath.split(path.sep);
    const fileName = spl[spl.length - 1];
    spl.pop();

    const directory = spl.join(path.sep);

    // Update status
    if (statusEntry) {
      await db.run(
        "UPDATE mediastatus set current_time=?, finished=? WHERE directory=? AND file_name=?",
        [time, finished, directory, fileName]
      );
    } else {
      await db.run(
        "INSERT INTO mediastatus (current_time, finished, directory, file_name) VALUES (?, ?, ?, ?)",
        [time, finished, directory, fileName]
      );
    }
  } catch (exc) {
    console.log(exc);
  }
}

async function addMediaStatusEntry(filepath, time, percentPos) {
  /*
  If percentPos 90% consider file finished
  If <= 5% don't save status to database.
  */
  let finished = 0;
  percentPos = parseFloat(percentPos);
  time = parseFloat(time);

  if (percentPos >= 90) finished = 1;
  else if (percentPos <= 5) return;

  await createMediaStatusEntry(filepath, time, finished);
  // Check if entry already exists
}

async function toggleFavorite(filepath) {
  try {
    const statusEntry = await getMediastatusEntries(filepath);

    let spl = filepath.split(path.sep);
    const fileName = spl[spl.length - 1];
    spl.pop();

    const directory = spl.join(path.sep);

    // If entry exists, toggle favorited status
    if (statusEntry) {
      const newFavorited = statusEntry.favorited ? 0 : 1;
      await db.run(
        "UPDATE mediastatus set favorited=? WHERE directory=? AND file_name=?",
        [newFavorited, directory, fileName]
      );
      return { favorited: newFavorited };
    } else {
      // Create new entry with favorited = 1
      await db.run(
        "INSERT INTO mediastatus (current_time, finished, directory, file_name, favorited) VALUES (?, ?, ?, ?, ?)",
        [0, 0, directory, fileName, 1]
      );
      return { favorited: 1 };
    }
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

async function getFavorites(directory = null) {
  try {
    if (directory) {
      if (directory[directory.length - 1] == path.sep)
        directory = directory.slice(0, -1);
      // Use LIKE to match directory and all subdirectories
      return await db.all(
        "SELECT * FROM mediastatus WHERE (directory=? OR directory LIKE ?) AND favorited=1 ORDER BY directory, file_name",
        [directory, directory + path.sep + '%']
      );
    } else {
      return await db.all("SELECT * FROM mediastatus WHERE favorited=1 ORDER BY directory, file_name");
    }
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

/*
  ***
    COLLECTIONS CRUD
  ***
*/
function validateEntry(data) {
  if (!fs.existsSync(data.path)) {
    throw new NotFoundException(`${data.path} not exists.`);
  }
}

async function createCollection(data) {
  // Validate entry path
  // if (data.paths && data.paths.length > 0) {
  //   data.paths.forEach((el) => {
  //     validateEntry(el);
  //   });
  // }

  const dbres = await db.run(
    "INSERT INTO collection (name, type) VALUES (?, ?)",
    data.name,
    data.type || 1
  );

  // Get new object
  let collection = await db.get(
    "SELECT * FROM collection WHERE id=?",
    dbres.lastID
  );
  collection.paths = [];
  if (data.paths && data.paths.length > 0) {
    data.paths.forEach(async (element) => {
      const entry = await createCollectionEntry(collection.id, element);
      collection.paths.push(entry);
    });
  }

  return collection;
}

async function getCollections(id = null) {
  if (id) {
    let collection = await db.get("SELECT * FROM collection WHERE id=?", id);

    if (collection) {
      collection.paths = await getCollectionEntries(collection.id);
      return collection;
    } else {
      return null;
    }
  } else {
    let collections = await db.all("SELECT * FROM collection");
    return collections;
  }
}

async function updateCollection(id, data) {
  // Validate entry paths.
  // TODO: Rollbacking on validation error would be better.
  // if (data.paths && data.paths.length > 0) {
  //   data.paths.forEach((el) => {
  //     validateEntry(el);
  //   });
  // }

  let collection = await db.get("SELECT * FROM collection WHERE id=?", id);
  if (!collection) throw new NotFoundException("Collection not exists.");
  // Update collection
  await db.run(
    "UPDATE collection SET name=COALESCE(?, name), type=COALESCE(?, type) WHERE id=?",
    [data.name, data.type, id]
  );
  // Update paths
  if (data.paths) {
    data.paths.forEach(async (element) => {
      // Add collection entry
      if (!element.id) await createCollectionEntry(collection.id, element);
      // Update path
      else await updateCollectionEntry(element.id, element);
    });
  }
  return await getCollections(id);
}

async function deleteCollection(id) {
  const collection = getCollections(id);
  if (!collection) throw new NotFoundException("Collection not exists.");
  await db.run("DELETE FROM collection WHERE id=?", id);
}

/*
  ***
  COLLECTION ENTIRES CRUD
  ***
*/
async function createCollectionEntry(collection_id, data) {
  // Check if collection exists
  const collectionExists = await getCollections(collection_id);
  if (!collectionExists) throw new NotFoundException("Collection not exists.");

  const dbres = await db.run(
    "INSERT INTO collection_entry (collection_id, path) VALUES (?, ?)",
    collection_id,
    data.path
  );
  const collection_entry = await db.get(
    "SELECT * FROM collection_entry WHERE id=?",
    dbres.lastID
  );
  return collection_entry;
}

async function getCollectionEntries(collection_id) {
  return await db.all(
    "SELECT * FROM collection_entry WHERE collection_id=?",
    collection_id
  );
}

async function getCollectionEntry(id) {
  return await db.get("SELECT * FROM collection_entry WHERE id=?", id);
}

async function updateCollectionEntry(id, data) {
  const collectionEntry = await getCollectionEntry(id);
  if (!collectionEntry)
    throw new NotFoundException("Collection entry not exists.");
  await db.run(
    "UPDATE collection_entry SET path=COALESCE(?, path) WHERE id=?",
    [data.path, id]
  );

  return await getCollectionEntry(id);
}

async function deleteCollectionEntry(id) {
  const collectionEntry = await getCollectionEntry(id);
  if (!collectionEntry)
    throw new NotFoundException("Collection entry not exists.");
  await db.run("DELETE FROM collection_entry WHERE id=?", id);
}

/*
  ***
    SAVED PLAYLISTS CRUD
  ***
*/
async function createSavedPlaylist(name, entries = []) {
  try {
    const dbres = await db.run(
      "INSERT INTO saved_playlist (name) VALUES (?)",
      name
    );

    const playlistId = dbres.lastID;

    // Add entries if provided
    if (entries && entries.length > 0) {
      for (let i = 0; i < entries.length; i++) {
        await db.run(
          "INSERT INTO saved_playlist_entry (playlist_id, file_path, position) VALUES (?, ?, ?)",
          [playlistId, entries[i], i]
        );
      }
    }

    return await getSavedPlaylist(playlistId);
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

async function getSavedPlaylists() {
  try {
    return await db.all("SELECT * FROM saved_playlist ORDER BY created_date DESC");
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

async function getSavedPlaylist(id) {
  try {
    const playlist = await db.get("SELECT * FROM saved_playlist WHERE id=?", id);
    if (playlist) {
      playlist.entries = await db.all(
        "SELECT * FROM saved_playlist_entry WHERE playlist_id=? ORDER BY position",
        id
      );
    }
    return playlist;
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

async function deleteSavedPlaylist(id) {
  try {
    const playlist = await getSavedPlaylist(id);
    if (!playlist) throw new NotFoundException("Saved playlist not exists.");
    await db.run("DELETE FROM saved_playlist WHERE id=?", id);
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

async function addEntryToSavedPlaylist(playlistId, filePath) {
  try {
    const playlist = await getSavedPlaylist(playlistId);
    if (!playlist) throw new NotFoundException("Saved playlist not exists.");

    // Get the next position
    const maxPosition = await db.get(
      "SELECT MAX(position) as max FROM saved_playlist_entry WHERE playlist_id=?",
      playlistId
    );
    const position = (maxPosition && maxPosition.max !== null) ? maxPosition.max + 1 : 0;

    await db.run(
      "INSERT INTO saved_playlist_entry (playlist_id, file_path, position) VALUES (?, ?, ?)",
      [playlistId, filePath, position]
    );

    return await getSavedPlaylist(playlistId);
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

async function removeEntryFromSavedPlaylist(entryId) {
  try {
    await db.run("DELETE FROM saved_playlist_entry WHERE id=?", entryId);
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

async function updatePlaylistEntryPositions(playlistId, entries) {
  try {
    // Update all entry positions in a transaction
    for (let i = 0; i < entries.length; i++) {
      await db.run(
        "UPDATE saved_playlist_entry SET position=? WHERE id=?",
        [i, entries[i].id]
      );
    }
    return await getSavedPlaylist(playlistId);
  } catch (exc) {
    console.log(exc);
    throw exc;
  }
}

// Exceptions
exports.NotFoundException = NotFoundException;

exports.initDB = initDB;
// Media status entries
exports.addMediaStatusEntry = addMediaStatusEntry;
exports.getMediastatusEntries = getMediastatusEntries;
exports.toggleFavorite = toggleFavorite;
exports.getFavorites = getFavorites;

// Collections
exports.createCollection = createCollection;
exports.getCollections = getCollections;
exports.updateCollection = updateCollection;
exports.deleteCollection = deleteCollection;

// Collection Entries
exports.createCollectionEntry = createCollectionEntry;
exports.getCollectionEntries = getCollectionEntries;
exports.deleteCollectionEntry = deleteCollectionEntry;
exports.updateCollection = updateCollection;

// Saved Playlists
exports.createSavedPlaylist = createSavedPlaylist;
exports.getSavedPlaylists = getSavedPlaylists;
exports.getSavedPlaylist = getSavedPlaylist;
exports.deleteSavedPlaylist = deleteSavedPlaylist;
exports.addEntryToSavedPlaylist = addEntryToSavedPlaylist;
exports.removeEntryFromSavedPlaylist = removeEntryFromSavedPlaylist;
exports.updatePlaylistEntryPositions = updatePlaylistEntryPositions;

// Get script folder
exports.getScriptFolder = getScriptFolder;
// Get mpv home folder
exports.getMPVHome = getMPVHome;
