const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5000;

// ==========================================
// FILE PATHS
// ==========================================

const dataFolder = path.join(__dirname, "data");
const usersFile = path.join(dataFolder, "users.json");
const monthlyDataFile = path.join(dataFolder, "monthly-data.json");

// ==========================================
// CREATE DATA FOLDER / FILES
// ==========================================

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, "[]", "utf8");
}

if (!fs.existsSync(monthlyDataFile)) {
    fs.writeFileSync(monthlyDataFile, "[]", "utf8");
}

// ==========================================
// USERS
// ==========================================

function getUsers() {
    try {
        const data = fs.readFileSync(usersFile, "utf8");

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);

    } catch (error) {

        console.log("users.json read error:", error);

        return [];
    }
}

function saveUsers(users) {

    fs.writeFileSync(
        usersFile,
        JSON.stringify(users, null, 2),
        "utf8"
    );
}

// ==========================================
// MONTHLY DATA
// ==========================================

function getMonthlyData() {

    try {

        const data = fs.readFileSync(
            monthlyDataFile,
            "utf8"
        );

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);

    } catch (error) {

        console.log(
            "monthly-data.json read error:",
            error
        );

        return [];
    }
}

function saveMonthlyData(data) {

    fs.writeFileSync(
        monthlyDataFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// ==========================================
// SEND JSON
// ==========================================

function sendJSON(res, status, data) {

    res.writeHead(status, {

        "Content-Type":
            "application/json; charset=utf-8",

        "Access-Control-Allow-Origin":
            "*",

        "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type"

    });

    res.end(
        JSON.stringify(data)
    );
}

// ==========================================
// READ BODY
// ==========================================

function readBody(req) {

    return new Promise((resolve, reject) => {

        let body = "";

        req.on("data", chunk => {

            body += chunk;

        });

        req.on("end", () => {

            try {

                if (!body) {

                    resolve({});

                    return;
                }

                resolve(
                    JSON.parse(body)
                );

            } catch (error) {

                reject(error);

            }

        });

        req.on("error", error => {

            reject(error);

        });

    });
}

// ==========================================
// SERVER
// ==========================================

const server = http.createServer(
    async (req, res) => {

        // ==================================
        // CORS
        // ==================================

        res.setHeader(
            "Access-Control-Allow-Origin",
            "*"
        );

        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type"
        );

        // ==================================
        // OPTIONS
        // ==================================

        if (req.method === "OPTIONS") {

            res.writeHead(204);

            res.end();

            return;
        }

        // ==================================
        // HOME
        // ==================================

        if (
            req.method === "GET" &&
            req.url === "/"
        ) {

            sendJSON(res, 200, {

                success: true,

                message:
                    "PARWA Monthly Data System Backend Running"

            });

            return;
        }

        // ==================================
        // ANM LOGIN
        // ==================================

        if (
            req.method === "POST" &&
            req.url === "/api/anm/login"
        ) {

            try {

                const body =
                    await readBody(req);

                const users =
                    getUsers();

                const username =
                    String(
                        body.username || ""
                    ).trim();

                const password =
                    String(
                        body.password || ""
                    ).trim();

                const user =
                    users.find(u =>

                        u.username === username &&

                        u.password === password &&

                        u.role === "anm" &&

                        u.active === true

                    );

                if (!user) {

                    sendJSON(res, 401, {

                        success: false,

                        message:
                            "Invalid ANM username or password."

                    });

                    return;
                }

                sendJSON(res, 200, {

                    success: true,

                    message:
                        "ANM Login Successful",

                    user: {

                        id:
                            user.id,

                        name:
                            user.name,

                        username:
                            user.username,

                        role:
                            user.role

                    }

                });

            } catch (error) {

                console.log(
                    "ANM Login Error:",
                    error
                );

                sendJSON(res, 500, {

                    success: false,

                    message:
                        "Server error."

                });

            }

            return;
        }

        // ==================================
        // CREATE ASHA
        // ==================================

        if (
            req.method === "POST" &&
            req.url === "/api/anm/create-asha"
        ) {

            try {

                const body =
                    await readBody(req);

                const name =
                    String(
                        body.name || ""
                    ).trim();

                const kendraSankhya =
                    String(
                        body.kendraSankhya || ""
                    ).trim();

                const username =
                    String(
                        body.username || ""
                    ).trim();

                const password =
                    String(
                        body.password || ""
                    ).trim();

                // CHECK FIELDS

                if (
                    !name ||
                    !kendraSankhya ||
                    !username ||
                    !password
                ) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "All fields are required."

                    });

                    return;
                }

                // PASSWORD LENGTH

                if (password.length < 4) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "Password must be at least 4 characters."

                    });

                    return;
                }

                const users =
                    getUsers();

                // CHECK USERNAME

                const existingUser =
                    users.find(
                        u =>
                            String(
                                u.username || ""
                            ).toLowerCase() ===
                            username.toLowerCase()
                    );

                if (existingUser) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "Username already exists."

                    });

                    return;
                }

                // NEW ID

                let newId = 1;

                if (users.length > 0) {

                    const ids =
                        users
                            .map(u =>
                                Number(u.id)
                            )
                            .filter(
                                id =>
                                    !isNaN(id)
                            );

                    if (ids.length > 0) {

                        newId =
                            Math.max(...ids) + 1;

                    }

                }

                // NEW ASHA

                const newASHA = {

                    id:
                        newId,

                    name:
                        name,

                    kendraSankhya:
                        kendraSankhya,

                    username:
                        username,

                    password:
                        password,

                    role:
                        "asha",

                    active:
                        true

                };

                users.push(
                    newASHA
                );

                saveUsers(
                    users
                );

                sendJSON(res, 200, {

                    success: true,

                    message:
                        "ASHA created successfully.",

                    user: {

                        id:
                            newASHA.id,

                        name:
                            newASHA.name,

                        kendraSankhya:
                            newASHA.kendraSankhya,

                        username:
                            newASHA.username

                    }

                });

            } catch (error) {

                console.log(
                    "Create ASHA Error:",
                    error
                );

                sendJSON(res, 500, {

                    success: false,

                    message:
                        "Server error while creating ASHA."

                });

            }

            return;
        }

        // ==================================
        // ASHA LIST
        // ==================================

        if (
            req.method === "GET" &&
            req.url === "/api/anm/asha-list"
        ) {

            try {

                const users =
                    getUsers();

                const ashaList =
                    users
                        .filter(
                            u =>
                                u.role === "asha"
                        )
                        .map(u => ({

                            id:
                                u.id,

                            name:
                                u.name,

                            kendraSankhya:
                                u.kendraSankhya,

                            username:
                                u.username,

                            active:
                                u.active

                        }));

                sendJSON(res, 200, {

                    success:
                        true,

                    total:
                        ashaList.length,

                    asha:
                        ashaList

                });

            } catch (error) {

                console.log(
                    "ASHA List Error:",
                    error
                );

                sendJSON(res, 500, {

                    success: false,

                    message:
                        "Unable to load ASHA list."

                });

            }

            return;
        }

        // ==================================
        // RESET ASHA PASSWORD
        // ==================================

        if (
            req.method === "POST" &&
            req.url === "/api/anm/reset-asha-password"
        ) {

            try {

                const body =
                    await readBody(req);

                const ashaId =
                    Number(body.ashaId);

                const newPassword =
                    String(
                        body.newPassword || ""
                    ).trim();

                // CHECK ASHA ID

                if (!ashaId) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "ASHA ID is required."

                    });

                    return;
                }

                // CHECK PASSWORD

                if (!newPassword) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "New password is required."

                    });

                    return;
                }

                if (newPassword.length < 4) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "Password must be at least 4 characters."

                    });

                    return;
                }

                const users =
                    getUsers();

                // FIND ASHA

                const ashaIndex =
                    users.findIndex(
                        u =>
                            Number(u.id) === ashaId &&
                            u.role === "asha"
                    );

                if (ashaIndex === -1) {

                    sendJSON(res, 404, {

                        success: false,

                        message:
                            "ASHA account not found."

                    });

                    return;
                }

                // UPDATE PASSWORD

                users[ashaIndex].password =
                    newPassword;

                saveUsers(
                    users
                );

                sendJSON(res, 200, {

                    success:
                        true,

                    message:
                        "ASHA password successfully reset.",

                    user: {

                        id:
                            users[ashaIndex].id,

                        name:
                            users[ashaIndex].name,

                        username:
                            users[ashaIndex].username

                    }

                });

            } catch (error) {

                console.log(
                    "Reset Password Error:",
                    error
                );

                sendJSON(res, 500, {

                    success: false,

                    message:
                        "Server error while resetting password."

                });

            }

            return;
        }

        // ==================================
        // ASHA LOGIN
        // ==================================

        if (
            req.method === "POST" &&
            req.url === "/api/asha/login"
        ) {

            try {

                const body =
                    await readBody(req);

                const username =
                    String(
                        body.username || ""
                    ).trim();

                const password =
                    String(
                        body.password || ""
                    ).trim();

                const users =
                    getUsers();

                const user =
                    users.find(u =>

                        u.username ===
                            username &&

                        u.password ===
                            password &&

                        u.role ===
                            "asha" &&

                        u.active ===
                            true

                    );

                if (!user) {

                    sendJSON(res, 401, {

                        success: false,

                        message:
                            "Invalid username or password."

                    });

                    return;
                }

                sendJSON(res, 200, {

                    success: true,

                    message:
                        "ASHA Login Successful",

                    user: {

                        id:
                            user.id,

                        name:
                            user.name,

                        username:
                            user.username,

                        kendraSankhya:
                            user.kendraSankhya,

                        role:
                            user.role

                    }

                });

            } catch (error) {

                console.log(
                    "ASHA Login Error:",
                    error
                );

                sendJSON(res, 500, {

                    success: false,

                    message:
                        "Server error."

                });

            }

            return;
        }

        // ==================================
        // SAVE ASHA MONTHLY DATA
        // ==================================

        if (
            req.method === "POST" &&
            req.url === "/api/asha/monthly-data"
        ) {

            try {

                const body =
                    await readBody(req);

                const ashaId =
                    body.ashaId;

                const month =
                    String(
                        body.month || ""
                    ).trim();

                const year =
                    String(
                        body.year || ""
                    ).trim();

                const entryDate =
                    String(
                        body.entryDate || ""
                    ).trim();

                // CHECK BASIC DATA

                if (
                    !ashaId ||
                    !month ||
                    !year
                ) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "Required data is missing."

                    });

                    return;
                }

                // FIND ASHA

                const users =
                    getUsers();

                const asha =
                    users.find(u =>

                        String(u.id) ===
                            String(ashaId) &&

                        u.role ===
                            "asha" &&

                        u.active ===
                            true

                    );

                if (!asha) {

                    sendJSON(res, 401, {

                        success: false,

                        message:
                            "ASHA account not found."

                    });

                    return;
                }

                // GET OLD DATA

                const monthlyData =
                    getMonthlyData();

                // DUPLICATE CHECK

                const duplicate =
                    monthlyData.find(item =>

                        String(item.ashaId) ===
                            String(ashaId) &&

                        String(item.month) ===
                            String(month) &&

                        String(item.year) ===
                            String(year)

                    );

                if (duplicate) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "Data for this month is already submitted."

                    });

                    return;
                }

                // NEW DATA ID

                let newId = 1;

                if (
                    monthlyData.length > 0
                ) {

                    const ids =
                        monthlyData
                            .map(item =>
                                Number(item.id)
                            )
                            .filter(
                                id =>
                                    !isNaN(id)
                            );

                    if (ids.length > 0) {

                        newId =
                            Math.max(...ids) + 1;

                    }

                }

                // SAVE DATA

                const newData = {

                    id:
                        newId,

                    ashaId:
                        asha.id,

                    ashaName:
                        asha.name,

                    kendraSankhya:
                        asha.kendraSankhya,

                    month:
                        month,

                    year:
                        year,

                    hbnc:
                        Number(body.hbnc) || 0,

                    hbvc:
                        Number(
                            body.hbvc ?? body.hbyc
                        ) || 0,

                    tb:
                        Number(body.tb) || 0,

                    antra:
                        Number(body.antra) || 0,

                    operation:
                        Number(body.operation) || 0,

                    copperT:
                        Number(body.copperT) || 0,

                    maleChild:
                        Number(body.maleChild) || 0,

                    femaleChild:
                        Number(body.femaleChild) || 0,

                    homeLiveBirth:
                        Number(body.homeLiveBirth) || 0,

                    homeWeakNewborn:
                        Number(body.homeWeakNewborn) || 0,

                    privateLiveBirth:
                        Number(body.privateLiveBirth) || 0,

                    privateWeakNewborn:
                        Number(body.privateWeakNewborn) || 0,

                    governmentLiveBirth:
                        Number(body.governmentLiveBirth) || 0,

                    governmentWeakNewborn:
                        Number(body.governmentWeakNewborn) || 0,

                    totalLiveBirth:
                        Number(body.totalLiveBirth) || 0,

                    firstDayHomeVisit:
                        Number(body.firstDayHomeVisit) || 0,

                    totalWeakNewborn:
                        Number(body.totalWeakNewborn) || 0,

                    firstWeekHomeVisit:
                        Number(body.firstWeekHomeVisit) || 0,

                    previousWeakChildren:
                        Number(body.previousWeakChildren) || 0,

                    previousWeakAliveAfterMonth:
                        Number(body.previousWeakAliveAfterMonth) || 0,

                    entryDate:
                        entryDate,

                    submittedAt:
                        new Date().toISOString(),

                    status:
                        "submitted"

                };

                monthlyData.push(
                    newData
                );

                saveMonthlyData(
                    monthlyData
                );

                sendJSON(res, 200, {

                    success:
                        true,

                    message:
                        "Monthly data submitted successfully.",

                    data:
                        newData

                });

            } catch (error) {

                console.log(
                    "Monthly Data Save Error:",
                    error
                );

                sendJSON(res, 500, {

                    success: false,

                    message:
                        "Server error while saving monthly data."

                });

            }

            return;
        }

        // ==================================
        // ANM VIEW MONTHLY DATA
        // ==================================

        if (
            req.method === "GET" &&
            req.url.startsWith(
                "/api/anm/monthly-data"
            )
        ) {

            try {

                const requestURL =
                    new URL(
                        req.url,
                        `http://localhost:${PORT}`
                    );

                const month =
                    requestURL.searchParams.get(
                        "month"
                    );

                const year =
                    requestURL.searchParams.get(
                        "year"
                    );

                const ashaId =
                    requestURL.searchParams.get(
                        "ashaId"
                    );

                // CHECK FILTERS

                if (
                    !month ||
                    !year ||
                    !ashaId
                ) {

                    sendJSON(res, 400, {

                        success: false,

                        message:
                            "Month, year and ASHA are required."

                    });

                    return;
                }

                const monthlyData =
                    getMonthlyData();

                const data =
                    monthlyData.find(item =>

                        String(item.ashaId) ===
                            String(ashaId) &&

                        String(item.month) ===
                            String(month) &&

                        String(item.year) ===
                            String(year)

                    );

                // NOT FOUND

                if (!data) {

                    sendJSON(res, 200, {

                        success:
                            true,

                        found:
                            false,

                        message:
                            "Data Not Submitted / डेटा जमा नहीं किया गया"

                    });

                    return;
                }

                // FOUND

                sendJSON(res, 200, {

                    success:
                        true,

                    found:
                        true,

                    data:
                        data

                });

            } catch (error) {

                console.log(
                    "View Monthly Data Error:",
                    error
                );

                sendJSON(res, 500, {

                    success: false,

                    message:
                        "Server error while loading data."

                });

            }

            return;
        }

        // ==================================
        // 404
        // ==================================

        sendJSON(res, 404, {

            success:
                false,

            message:
                "API route not found."

        });

    }
);

// ==========================================
// START SERVER
// ==========================================

server.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "===================================="
        );
        console.log(
            "PARWA MONTHLY DATA SYSTEM"
        );
        console.log(
            "===================================="
        );
        console.log(
            "Server running on:"
        );
        console.log(
            "http://localhost:5000"
        );
        console.log(
            "===================================="
        );
        console.log("");

    }
);