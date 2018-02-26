var fs = require('fs');
var request = require("request");
var xml2js = require('xml2js');

var CACHE = {};

var SHORTED = {
    '하닉': 'sk하이닉스',
    '넷마': '넷마블게임즈',
    '엔씨': '엔씨소프트',
    '펄어': '펄어비스',
    '삼전': '삼성전자',
    '엔도': '내츄럴엔도텍'
};

exports.handler = function (event, context, endLambda) {
    console.log(event);

    if (checkToken(event.token) === false) {
        endLambda(
            null,
            createSlackResponse("올바르지 않은 토큰 값 입니다.",
                [
                    {
                        "text": "보낸 토큰: " + event.token,
                        "color": "#ff3300"
                    }
                ]));
        return;
    }

    if (event.command === "/stock") {
        workStock(event, context, endLambda);
    } else if (event.command === "/coin") {
        workCoin(event, context, endLambda);
    } else if (event.command === "/cat") {
        workCat(event, context, endLambda);
    }
};

function checkToken(token) {
    return token === '' || token === '' || token === '';
}

function createSlackResponse(text, attachments) {
    return {
        "response_type": "in_channel",
        "text": text,
        "attachments": attachments
    }
}

function parseStockText(text) {
    var tokens = text.split(" ");
    
    return {
        StockName: tokens[0],
        Arg: tokens[1] ? tokens[1] : ""
    }
}

function getRandomIndex(max) {
    // return Math.floor(Math.random() * (max - min)) + min;
    var now = Math.round(+new Date() / 1000);
    return now % max;
}

function workStock(event, context, endLambda) {
    if (event.text.includes("단축")) {
        var res = "";
        for (var attr in SHORTED) {
            res += `${attr}: ${SHORTED[attr]}\n`;
        }
        endLambda(
            null,
            createSlackResponse("단축 종목명",
                [
                    {
                        "text": res
                    }
                ]));
        return;
    }

    if (event.text.includes("기범")) {
        var gbUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/gb/${getRandomIndex(7)}.jpg`;
        endLambda(
            null,
            createSlackResponse(event.text,
                [
                    {
                        "text": "망한거같아요",
                        //"color": "#ff3300",
                        "image_url": gbUrl
                    }
                ]));
        return;
    }

    if (event.text.includes("수온")) {
        workRiverTemp(event, context, endLambda);
        return;
    }

    if (event.text.includes("한강")) {
        workRiver(event, context, endLambda);
        return;
    }

    if (CACHE.stocks === null || CACHE.stocks === undefined) {
        var stockList = fs.readFileSync(__dirname + '/files/stock_list.csv', 'utf8').toString().split('\n');
        var stocks = {}
        for (var i = 1; i < stockList.length; ++i) {
            var tokens = stockList[i].split(',');
            stocks[tokens[0].toLowerCase()] = tokens[1];
        }

        CACHE.stocks = stocks;
    }

    var stocks = CACHE.stocks;
    var parsedText = parseStockText(event.text);

    var originalName = SHORTED[parsedText.StockName];
    if (originalName) {
        parsedText.StockName = originalName;
    }

    // console.log(parsedText);
    var stockNumber = stocks[parsedText.StockName.toLowerCase()];
    if (stockNumber === null || stockNumber === undefined) {
        var dontKnowUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/dontknow/${getRandomIndex(5)}.jpg`;
        endLambda(
            null,
            createSlackResponse("?",
                [
                    {
                        "text": `${event.user_name}이(가) 무슨 말을 하는지 모르겠다.`,
                        "color": "#ff3300",
                        "image_url": dontKnowUrl
                    }
                ]));
        return;
    }

    stockNumber = stockNumber.trim();

    if (parsedText.Arg.toLocaleLowerCase() === 'd') {
        workStockDetail(stockNumber, parsedText, endLambda);
    } else {
        workStockGraph(stockNumber, parsedText, endLambda);
    }
}

function workRiver(event, context, endLambda) {
    endLambda(
        null,
        createSlackResponse("임시 기능 입니다.",
            [
                {
                    "text": "이후 업데이트 예정입니다.",
                    "image_url": "http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/han_river.jpg"
                }
            ]));
}

function workRiverTemp(event, context, endLambda) {
    var tempUrl = "http://hangang.dkserver.wo.tc/";
    var doomedUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/gb/${getRandomIndex(7)}.jpg`;

    var options = {
        method: "GET",
        url: tempUrl
    };

    request(options,
        function(err, res, body) {
            if (err || res.statusCode !== 200) {
                endLambda(
                    null,
                    createSlackResponse("오류.\n" + body,
                        [
                            {
                                "text": "Error",
                                "color": "#ff3300",
                                "image_url": doomedUrl
                            }
                        ]));
                return;
            }

            //console.log(typeof body);
            console.log(body);

            var info = JSON.parse(body);
            // console.log(info);

            var resStr = `현재 한강의 수온은 ${info.temp} 도 입니다. (마지막 측정 시간: ${info.time})`;

            endLambda(
                null,
                createSlackResponse("힘내세요!",
                    [
                        {
                            "text": resStr,
                            //"color": '#0000FF',
                            "image_url": "http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/good/0.jpg"
                        }
                    ]));
        });
}

function workStockGraph(stockNumber, parsedText, endLambda) {
    stockNumber = stockNumber.trim();

    var stockUrl = `http://imgfinance.naver.net/chart/item/area/day/${stockNumber}.png`;
    // console.log(stockUrl);

    endLambda(
        null,
        createSlackResponse(parsedText.StockName,
            [
                {
                    "text": stockNumber,
                    //"color": "#ff3300",
                    "image_url": stockUrl
                }
            ]));
}

function workStockDetail(stockNumber, parsedText, endLambda) {
    var stockUrl = `http://asp1.krx.co.kr/servlet/krx.asp.XMLSiseEng?code=${stockNumber}`;

    var options = {
        method: "GET",
        url: stockUrl
    };

    var doomedUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/gb/${getRandomIndex(7)}.jpg`;

    request(options,
        function (err, res, body) {
            if (err || res.statusCode !== 200) {
                endLambda(
                    null,
                    createSlackResponse("오류.\n" + body,
                        [
                            {
                                "text": "Error",
                                "color": "#ff3300"
                            }
                        ]));
                return;
            }

            //console.log(typeof body);
            console.log(body);

            var parseString = xml2js.parseString;
            parseString(body,
                function(err, result) {
                    if (err) {
                        endLambda(
                            null,
                            createSlackResponse("오류.\n" + body,
                                [
                                    {
                                        "text": "....",
                                        "color": "#ff3300",
                                        "image_url": doomedUrl
                                    }
                                ]));
                        return;
                    }

                    var states = [
                        'x',
                        '++',
                        '+',
                        '=',
                        '--',
                        '-'
                    ];

                    
                    console.log(result);
                    var stockInfo = result['stockprice']['TBL_StockInfo'][0]['$'];
                    var stateIndex = parseInt(stockInfo['DungRak']);
                    var color = '#00FF00';
                    if (stateIndex <= 2) {
                        color = '#FF0000';
                    } else if (4 <= stateIndex) {
                        color = '#0000FF';
                    }

                    var rate = ((parseFloat(stockInfo['CurJuka']) / parseFloat(stockInfo['PrevJuka'])) - 1) * 100;
                    var resStr = `현재가: ${stockInfo['CurJuka']}\n` +
                        `전일대비: ${states[stateIndex]}${stockInfo['Debi']} (${rate}%)\n` +
                        `전일종가: ${stockInfo['PrevJuka']}\n` +
                        `거래량: ${stockInfo['Volume']}\n` +
                        `거래대금: ${stockInfo['Money']}\n` +
                        `시가: ${stockInfo['StartJuka']}\n` +
                        `고가: ${stockInfo['HighJuka']}\n` +
                        `저가: ${stockInfo['LowJuka']}\n` +
                        `52주 최고: ${stockInfo['High52']}\n` +
                        `52주 최저: ${stockInfo['Low52']}\n` +
                        `상한가: ${stockInfo['UpJuka']}\n` +
                        `하한가: ${stockInfo['DownJuka']}\n`;

                    endLambda(
                        null,
                        createSlackResponse(parsedText.StockName,
                            [
                                {
                                    "text": resStr,
                                    "color": color,
                                }
                            ]));
                });
        });
}

function workCoin(event, context, endLambda) {
    var c = '';
    for (var i = 0; i < 6; ++i) {
        c += getRandomIndex(9).toString();
    }

    if (event.text.includes("빗갤금짤")) {
        var gazuaUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/gazua/test.gif`;
        endLambda(
            null,
            createSlackResponse("비트코인갤러리금지짤",
                [
                    {
                        "text": `${event.text}`,
                        "color": "#" + c,
                        "image_url": gazuaUrl
                    }
                ]));
        return;
    }

    if (event.text.includes("가즈") || event.text.includes("즈아") || event.text.includes("가자") ||
        event.text.toLowerCase().includes("gaz") || event.text.toLowerCase().includes("zua") || event.text.toLowerCase().includes("gaza")) {
        if (getRandomIndex(100) < 20) {
            var failUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/gazua/fail${getRandomIndex(1)}.jpg`;
            endLambda(
                null,
                createSlackResponse("못감.",
                    [
                        {
                            "text": `실패하였습니다.`,
                            "color": "#" + c,
                            "image_url": failUrl
                        }
                    ]));
            return;
        }

        var gazuaUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/gazua/gazua${getRandomIndex(13)}.jpg`;
        endLambda(
            null,
            createSlackResponse("gazua~",
                [
                    {
                        "text": `${event.text}`,
                        "color": "#" + c,
                        "image_url": gazuaUrl
                    }
                ]));
        return;
    }

    if (event.text.includes("소리를")) {
        var fobiddenUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/fobidden/fobidden${getRandomIndex(3)}.jpg`;
        endLambda(
            null,
            createSlackResponse("누구인가?",
                [
                    {
                        "text": `${event.text}`,
                        "color": "#" + c,
                        "image_url": fobiddenUrl
                    }
                ]));
        return;
    }

    var currency = event.text;

    var kor2Curr = {
        '비트코인': 'btc',
        '비트코인캐시': 'bch',
        '비캐': 'bch',
        '이더리움': 'eth',
        '이더': 'eth',
        '이더리움클래식': 'etc',
        '이클': 'etc',
        '리플': 'xrp',
        '퀀텀': 'qtum',
        '아이오타': 'iota',
        '라이트코인': 'ltc',
        '라코': 'ltc',
        '이오스': 'eos',
        '히오스': 'eos',
        '시공': 'eos'
    };

    if (kor2Curr[currency]) {
        currency = kor2Curr[currency];
    }

    currency = currency.toLowerCase();

    var options = {
        method: "GET",
        url: "https://api.coinone.co.kr/ticker?currency=" + currency
    };

    if (currency === 'eos') {
        options = {
            method: "GET",
            url: 'https://api.bithumb.com/public/ticker/eos'
        };
    }
        
    var currencies = ['btc', 'bch', 'eth', 'etc', 'xrp', 'qtum', 'iota', 'ltc', 'eos'];
    var currency2Kor = {
        'btc': '비트코인(BTC)',
        'bch': '비트코인캐시(BCH)',
        'eth': '이더리움(ETH)',
        'etc': '이더리움클래식(ETC)',
        'xrp': '리플(XRP)',
        'qtum': '퀀텀(QTUM)',
        'iota': '아이오타(IOTA)',
        'ltc': '라이트코인(LTC)',
        'eos': '이오스(EOS)'
    };

    var isFobidden = false;
    var fobiddenImageUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/slack_pic/fobidden/fobidden${getRandomIndex(3)}.jpg`;
    if (currency === 'iota') {
        if (event.user_name !== 'kim_jungwoo_' &&
            event.user_name !== 'lee_hwaju') {
            isFobidden = true;
        }
    }

    request(options,
        function(err, res, body) {
            if (err || res.statusCode !== 200) {
                endLambda(
                    null,
                    createSlackResponse("오류.\n" + body,
                        [
                            {
                                "text": "all, btc(비트코인), bch(비트코인캐시), eth(이더리움), etc(이더리움클래식), xrp(리플), qtum(퀀텀), iota(아이오타), ltc(라이트코인), eos(이오스)",
                                "color": "#ff3300"
                            }
                        ]));
                return;
            }

            function createResult(parsed) {
                var diff = parseFloat(parsed.last) - parseFloat(parsed.yesterday_last);
                var rate = ((parseFloat(parsed.last) / parseFloat(parsed.yesterday_last)) - 1) * 100;
                
                var color = '#00FF00';
                if (0.0 < diff) {
                    color = '#FF0000';
                } else if (diff < 0.0) {
                    color = '#0000FF';
                }

                var result = `${currency2Kor[parsed.currency]}: ${parseInt(parsed.last).toLocaleString()} (${diff}, ${rate}%)\n`;
                return { price: result, color: color, priceInt: parseInt(parsed.last) }
            }

            function createResultEos(parsed) {
                var diff = parseInt(parsed.data.buy_price) - parseInt(parsed.data.opening_price);
                var rate = parseInt(parsed.data.buy_price) / parseInt(parsed.data.opening_price);
                rate = rate * 100 - 100;
                rate = Math.round(rate * 100) / 100;

                var color = '#00FF00';
                if (0.0 < rate) {
                    color = '#FF0000';
                } else if (rate < 0.0) {
                    color = '#0000FF';
                }

                var result = `${currency2Kor['eos']}: ${parseInt(parsed.data.buy_price).toLocaleString()} (${diff}, ${rate}%)\n`;
                return { price: result, color: color, priceInt: parseInt(parsed.data.buy_price) }
            }

            //console.log(typeof body);
            console.log(body);
            var parsed = JSON.parse(body);

            var result = { price: '', color: '#00FF00' };

            var price = 'error';
            var color = '#00FF00';
            if (currency !== 'all') {
                if (currency === 'eos') {
                    result = createResultEos(parsed);
                } else {
                    result = createResult(parsed);
                }

                price = result.price;
                color = result.color;
            } else {
                price = '';
                currencies.forEach((curr) => {
                    if (curr !== 'eos') {
                        result = createResult(parsed[curr]);
                        price += result.price + '\n';   
                    }
                });
            }

            if (isFobidden) {
                var c = currency2Kor[currency].replace(/\(\w+\)/g, '');
                price += `\n누구인가? 지금 누가 ${c} 소리를 내었어?\n누가 ${c} 소리를 내었는가 말이야?!`;
            }

            var imageUrl = isFobidden ? fobiddenImageUrl : '';

            endLambda(
                null,
                createSlackResponse(event.text,
                    [
                        {
                            "text": price,
                            "color": color,
                            "image_url": imageUrl
                        }
                    ]));
        });
}

function workCat(event, context, endLambda) {
    var categories = [
        'hats',
        'space',
        'funny',
        'sunglasses',
        'boxes',
        'caturday',
        'ties',
        'dream',
        'kittens',
        'sinks',
        'clothes'
    ];

    var category = categories[(parseInt(event.text) - 1) % categories.length];
    if (category === null || category === undefined) {
        var i = getRandomIndex(categories.length);
        category = categories[i];
    }

    var options = {
        method: "GET",
        url: `http://thecatapi.com/api/images/get?api_key=MjM1NTg4&format=xml&${category}&type=jpg`
    };

    var doomedUrl = `http://s3.ap-northeast-2.amazonaws.com/io-slack.iodev.us/gb/${getRandomIndex(7)}.jpg`;

    request(options,
        function (err, res, body) {
            if (err || res.statusCode !== 200) {
                endLambda(
                    null,
                    createSlackResponse("오류.\n" + body,
                        [
                            {
                                "text": "....",
                                "color": "#ff3300",
                                "image_url": doomedUrl
                            }
                        ]));
                return;
            }

            //console.log(typeof body);
            console.log(body);

            var parseString = xml2js.parseString;
            parseString(body,
                function(err, result) {
                    if (err) {
                        endLambda(
                            null,
                            createSlackResponse("오류.\n" + body,
                                [
                                    {
                                        "text": "....",
                                        "color": "#ff3300",
                                        "image_url": doomedUrl
                                    }
                                ]));
                        return;
                    }

                    console.log(result);

                    var catUrl = result.response.data[0].images[0].image[0].url[0];

                    endLambda(
                        null,
                        createSlackResponse(event.text,
                            [
                                {
                                    "text": result,
                                    "image_url": catUrl
                                    //"color": "#ff3300",
                                }
                            ]));
                });
        });
}