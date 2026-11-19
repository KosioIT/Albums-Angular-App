import { db } from '../config/firebase/firebase.js';

const TOP_LIMIT = 5;

/*
  Site-wide numbers for the admin statistics page, computed from the album counters
  (likes, listens, guestListens, downloads), so it costs one read of the albums plus a user count.
*/
export async function getSiteStats() {
    const [albumsSnap, usersCount] = await Promise.all([
        db.collection('albums').get(),
        db.collection('users').count().get(),
    ]);

    const albums = albumsSnap.docs.map((d) => {
        const a = d.data();
        const listens = a.listens || 0;
        const guestListens = a.guestListens || 0;
        return {
            id: d.id,
            title: a.title,
            artist: a.artist,
            rank: a.rank || 'common',
            cover_img_url: a.cover_img_url || null,
            likes: a.likes || 0,
            listens,
            guestListens,
            totalListens: listens + guestListens,
            downloads: a.downloads || 0,
        };
    });

    const sum = (list, field) => list.reduce((s, a) => s + a[field], 0);
    const top = (field) =>
        albums
            .filter((a) => a[field] > 0)
            .sort((x, y) => y[field] - x[field] || x.title.localeCompare(y.title))
            .slice(0, TOP_LIMIT);

    const bands = [...new Set(albums.map((a) => a.artist))]
        .map((artist) => {
            const list = albums.filter((a) => a.artist === artist);
            return {
                artist,
                albums: list.length,
                likes: sum(list, 'likes'),
                listens: sum(list, 'listens'),
                guestListens: sum(list, 'guestListens'),
                totalListens: sum(list, 'totalListens'),
                downloads: sum(list, 'downloads'),
            };
        })
        .sort((x, y) => y.totalListens - x.totalListens || x.artist.localeCompare(y.artist));

    return {
        totals: {
            users: usersCount.data().count,
            albums: albums.length,
            likes: sum(albums, 'likes'),
            listens: sum(albums, 'listens'),
            guestListens: sum(albums, 'guestListens'),
            totalListens: sum(albums, 'totalListens'),
            downloads: sum(albums, 'downloads'),
        },
        top: {
            listens: top('totalListens'),
            likes: top('likes'),
            downloads: top('downloads'),
        },
        bands,
    };
}
