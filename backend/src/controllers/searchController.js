import { analyzeSearchQuery } from "../services/aiSearchService.js";
import { getAllAlbumsFromFirestore } from '../services/albumService.js';
import { filterAlbumsAdvanced } from "../utils/albumUtils.js"

export async function searchAlbums(req, res) {
  try {
    const q = req.query.q;
    const criteria = await analyzeSearchQuery(q);
    const albums = await getAllAlbumsFromFirestore();
    const results = filterAlbumsAdvanced(albums, criteria);

    return res.json({
      success: true,
      criteria,
      results
    });

  } catch (err) {
    console.log("Error in searchAlbums: ", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
