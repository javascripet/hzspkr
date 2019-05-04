var Volume=new function(){
	/**
	 * toneType:0 连续,1 摩擦, 2 爆破
	 **/
	///////////////////////////////////////////////////////////////////////
	/**
	 * 把拼音转换成Vl模型
	 **/
	this.fire= function(tokens){
		var idxTokens;
		var token;
		var tokenP;
		var tokenN;
		var i;
		for(idxTokens=0;idxTokens<tokens.length;idxTokens++){
			token=tokens[idxTokens];
			if(token.pinyin=="#"){
				token.vlModel=[0,0,0,0,0,0,0,0,0,0,0,0];
			}else{
				var toneType;
				if (token.initial!=""){//如果有声母部分 z c s 等
					toneType=1;
				}else if (
					token.head.length==1			//a o e i u v
					||token.head.indexOf("l")>-1
					||token.head.indexOf("m")>-1
					||token.head.indexOf("n")>-1
					||token.head.indexOf("r")>-1
				){
					toneType=0;
				}else{
					toneType=2;
				}
				tokenP=null;
				tokenN=null;
				if (idxTokens==0){
					tokenP=null;
				}else{
					tokenP=tokens[idxTokens-1];
					if (tokenP.pinyin=="#"){
						tokenP=null;
					}
				}
				if(idxTokens==tokens.length-1){
					tokenN=null;
				}else{
					tokenN=tokens[idxTokens+1];
					if (tokenN.pinyin=="#"){
						tokenN=null;
					}
				}				
				var model=this.get(toneType,token.tone);
				if(tokenP!=null){
					var modelP=tokenP.vlModel;
					if(modelP!=null){
						model[0]=modelP[modelP.length-1];
					}
				}else{
					model[0]=0;
				}
				if (tokenN==null){
					model[11]=0;
				}
				token.vlModel=model;
				/////////////////////////////////////////////////////////////////
				//如果一个字和前字亲密,这个字就容易柔和.否则就强硬.强硬的话就接近单独读4声时候的效果.
				var pinyinShift=this.getPinyinShift(token.pinyinWithoutTone,token.tone)
				*((Tokens.MAX_LOG-token.logarithmHz)/Tokens.MAX_LOG+
				(Tokens.MAX_LOG-token.logarithmP)/Tokens.MAX_LOG);
				pinyinShift=pinyinShift/2;//考虑的说话时的连贯性所以/2
				/////////////////////////////////////////////////////////////////
				for(i=0;i<12;i++){
					token.vlModel[i]*=(token.volume*i/11+pinyinShift*(11-i)/11);
				}
				token.volume=(token.volume+pinyinShift);//提高声母的音量 TODO
			}
		}

		var allvlModel=[];
		allvlModel.push(0);
		for(idxTokens=0;idxTokens<tokens.length;idxTokens++){
			tokenP=tokens[idxTokens-1];
			token=tokens[idxTokens];
			var v=allvlModel.pop();
			token.vlModel[0]=(v+token.vlModel[0])/2;
			allvlModel=allvlModel.concat(token.vlModel);
		}
		for(i=2;i<allvlModel.length-2;i++){
			allvlModel[i]=(
				+allvlModel[i-2]*0.125
				+allvlModel[i-1]*0.25
				+allvlModel[i]
				+allvlModel[i+1]*0.25
				+allvlModel[i+2]*0.125
				)/1.75;
		}
		for(idxTokens=0;idxTokens<tokens.length;idxTokens++){
			token=tokens[idxTokens];
			for(i=0;i<12;i++){
				token.vlModel[i]=allvlModel[idxTokens*11+i];
			}
		}

		return tokens;
	};
	
	this.get= function(toneType,tone){
		var ret=[];
		var model=this.data[toneType];
		var model2=[];
		if (tone==0){
			model2=this.data2[0];
		}else if (tone==1){
			model2=this.data2[1];
		}else if (tone==2){
			model2=this.data2[2];
		}else if (tone==3){
			model2=this.data2[3];
		}else if (tone==4){
			model2=this.data2[4];
		}
		for (var i=0;i<model.length;i++){
			ret.push(model[i]*model2[i]);
		}
		return ret;
	};
	this.getPinyinShift= function(pinyinWithoutTone,tone){
		var pinyinShift=0;
		
		if (tone==0){pinyinShift=0.118;}
		else if (tone==1){pinyinShift=0.199;}//实际测出的值和模型值的差
		else if (tone==2){pinyinShift=0.122;}
		else if (tone==3){pinyinShift=0.118;}
		else if (tone==4){pinyinShift=0.197;}
		
		if (this.pinyinShifts[pinyinWithoutTone]!=null){
			var aryPinShifts=this.pinyinShifts[pinyinWithoutTone];
			if (tone==0){pinyinShift=aryPinShifts[2];}
			else if (tone==1){pinyinShift=aryPinShifts[0];}
			else if (tone==2){pinyinShift=aryPinShifts[1];}
			else if (tone==3){pinyinShift=aryPinShifts[2];}
			else if (tone==4){pinyinShift=aryPinShifts[3];}
		}else{
		}
		return pinyinShift;
	};
	
	this.data=[
		[0.6,0.6,0.70,0.76,0.90,0.98,1.00,0.98,0.95,0.85,0.75,0.6],//0 type a o e i u v
		[0.6,0.00,0.15,0.30,1.00,1.00,0.98,0.95,0.90,0.83,0.75,0.6],//1   z c s
		[0.6,0.00,0.00,0.00,0.80,0.90,0.93,0.90,0.85,0.80,0.75,0.6],//2  b t
	];
		
	this.data2=[
		[1.0,1.0,1.0,1.0,1.0,1.0,0.75,0.5,0.25,0.0,0.0,0.0],//0 tone
		[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],//1
		[0.5,0.5,0.5,0.5,0.6,0.7,0.8,0.9,1.0,1.0,1.0,1.0],//2
		[1.0,1.0,1.0,1.0,1.0,0.9,0.8,0.7,0.6,0.5,0.5,0.5],//3
		[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],//4
	];
	this.pinyinShifts={
"a":[0.288,0.159,0.146,0.318],
"ai":[0.279,0.136,0.13,0.298],
"an":[0.289,0.156,0.145,0.304],
"ang":[0.279,0.151,0.158,0.31],
"ao":[0.26,0.14,0.146,0.282],
"ba":[0.267,0.154,0.139,0.292],
"bai":[0.258,0.131,0.122,0.271],
"ban":[0.268,0.151,0.138,0.278],
"bang":[0.258,0.146,0.15,0.283],
"bao":[0.238,0.136,0.138,0.255],
"bei":[0.174,0.098,0.092,0.202],
"ben":[0.188,0.11,0.11,0.207],
"beng":[0.198,0.12,0.123,0.215],
"bi":[0.135,0.076,0.069,0.15],
"bian":[0.174,0.095,0.092,0.182],
"biao":[0.239,0.137,0.12,0.234],
"bie":[0.16,0.085,0.074,0.178],
"bin":[0.15,0.08,0.079,0.156],
"bing":[0.153,0.087,0.088,0.162],
"bo":[0.183,0.118,0.088,0.198],
"bu":[0.134,0.079,0.071,0.151],
"ca":[0.251,0.147,0.128,0.256],
"cai":[0.242,0.124,0.111,0.234],
"can":[0.252,0.144,0.127,0.241],
"cang":[0.242,0.139,0.139,0.246],
"cao":[0.222,0.128,0.128,0.219],
"ce":[0.156,0.094,0.073,0.148],
"cen":[0.172,0.103,0.1,0.17],
"ceng":[0.182,0.114,0.112,0.178],
"cha":[0.254,0.148,0.129,0.267],
"chai":[0.244,0.124,0.112,0.246],
"chan":[0.254,0.145,0.128,0.252],
"chang":[0.245,0.14,0.14,0.258],
"chao":[0.225,0.129,0.128,0.23],
"che":[0.158,0.094,0.074,0.16],
"chen":[0.176,0.104,0.1,0.182],
"cheng":[0.185,0.114,0.113,0.19],
"chi":[0.122,0.07,0.059,0.126],
"chong":[0.147,0.09,0.089,0.148],
"chou":[0.179,0.106,0.1,0.179],
"chu":[0.122,0.072,0.061,0.126],
"chuai":[0.236,0.116,0.112,0.246],
"chuan":[0.215,0.13,0.124,0.226],
"chuang":[0.217,0.124,0.117,0.218],
"chui":[0.136,0.081,0.098,0.134],
"chun":[0.146,0.086,0.081,0.146],
"chuo":[0.162,0.094,0.073,0.157],
"ci":[0.119,0.07,0.058,0.114],
"cong":[0.144,0.089,0.088,0.136],
"cou":[0.176,0.106,0.099,0.167],
"cu":[0.118,0.072,0.06,0.114],
"cuan":[0.212,0.129,0.124,0.214],
"cui":[0.133,0.08,0.097,0.122],
"cun":[0.143,0.086,0.08,0.134],
"cuo":[0.158,0.094,0.072,0.146],
"da":[0.272,0.167,0.156,0.269],
"dai":[0.262,0.145,0.139,0.248],
"dan":[0.272,0.164,0.154,0.255],
"dang":[0.263,0.16,0.167,0.26],
"dao":[0.243,0.149,0.155,0.232],
"de":[0.176,0.114,0.1,0.162],
"dei":[0.179,0.112,0.108,0.18],
"deng":[0.203,0.134,0.14,0.192],
"di":[0.14,0.09,0.086,0.128],
"dia":[0.259,0.164,0.149,0.259],
"dian":[0.179,0.108,0.109,0.16],
"diao":[0.244,0.151,0.136,0.212],
"die":[0.165,0.099,0.091,0.155],
"ding":[0.158,0.1,0.105,0.139],
"diu":[0.158,0.106,0.107,0.146],
"dong":[0.165,0.11,0.116,0.15],
"dou":[0.197,0.126,0.126,0.182],
"du":[0.139,0.092,0.088,0.128],
"duan":[0.233,0.15,0.151,0.228],
"dui":[0.154,0.101,0.124,0.136],
"dun":[0.163,0.107,0.108,0.148],
"duo":[0.18,0.114,0.1,0.16],
"e":[0.166,0.108,0.089,0.184],
"ei":[0.169,0.106,0.096,0.2],
"en":[0.184,0.117,0.115,0.206],
"er":[0.234,0.166,0.138,0.295],
"fa":[0.287,0.19,0.174,0.309],
"fan":[0.288,0.188,0.172,0.294],
"fang":[0.278,0.182,0.185,0.3],
"fei":[0.194,0.135,0.126,0.219],
"fen":[0.208,0.146,0.145,0.224],
"feng":[0.218,0.157,0.158,0.232],
"fo":[0.203,0.154,0.122,0.215],
"fou":[0.212,0.149,0.145,0.221],
"fu":[0.154,0.115,0.106,0.168],
"ga":[0.3,0.187,0.177,0.305],
"gai":[0.29,0.164,0.16,0.284],
"gan":[0.3,0.184,0.176,0.29],
"gang":[0.291,0.179,0.188,0.296],
"gao":[0.271,0.168,0.176,0.268],
"ge":[0.205,0.134,0.122,0.198],
"gei":[0.207,0.132,0.13,0.215],
"gen":[0.222,0.143,0.148,0.22],
"geng":[0.231,0.154,0.161,0.228],
"gong":[0.193,0.129,0.137,0.186],
"gou":[0.225,0.146,0.148,0.217],
"gu":[0.168,0.112,0.109,0.164],
"gua":[0.304,0.189,0.171,0.296],
"guai":[0.282,0.156,0.16,0.284],
"guan":[0.261,0.169,0.172,0.264],
"guang":[0.263,0.164,0.165,0.256],
"gui":[0.182,0.12,0.146,0.172],
"gun":[0.192,0.126,0.13,0.184],
"guo":[0.208,0.134,0.121,0.195],
"ha":[0.29,0.163,0.154,0.31],
"hai":[0.281,0.14,0.137,0.288],
"han":[0.291,0.16,0.152,0.295],
"hang":[0.282,0.155,0.165,0.3],
"hao":[0.262,0.145,0.153,0.272],
"he":[0.195,0.11,0.098,0.202],
"hei":[0.198,0.108,0.106,0.22],
"hen":[0.212,0.119,0.125,0.224],
"heng":[0.222,0.13,0.138,0.232],
"hong":[0.184,0.105,0.114,0.19],
"hou":[0.216,0.122,0.124,0.222],
"hu":[0.158,0.088,0.085,0.168],
"hua":[0.294,0.165,0.148,0.3],
"huai":[0.272,0.132,0.137,0.288],
"huan":[0.252,0.145,0.149,0.268],
"huang":[0.254,0.14,0.142,0.26],
"hui":[0.172,0.096,0.122,0.176],
"hun":[0.182,0.102,0.106,0.188],
"huo":[0.198,0.11,0.098,0.2],
"ji":[0.125,0.077,0.072,0.124],
"jia":[0.244,0.151,0.135,0.256],
"jian":[0.164,0.096,0.096,0.156],
"jiang":[0.254,0.149,0.138,0.25],
"jiao":[0.228,0.138,0.123,0.208],
"jie":[0.15,0.086,0.078,0.152],
"jin":[0.139,0.08,0.082,0.13],
"jing":[0.143,0.088,0.091,0.136],
"jiong":[0.136,0.084,0.086,0.136],
"jiu":[0.143,0.092,0.094,0.142],
"jv":[0.122,0.074,0.07,0.122],
"jvan":[0.172,0.106,0.106,0.167],
"jve":[0.156,0.097,0.087,0.152],
"jvn":[0.145,0.089,0.088,0.136],
"ka":[0.278,0.168,0.164,0.296],
"kai":[0.269,0.145,0.148,0.274],
"kan":[0.279,0.165,0.163,0.281],
"kang":[0.27,0.16,0.176,0.286],
"kao":[0.25,0.15,0.163,0.258],
"ke":[0.183,0.114,0.109,0.188],
"ken":[0.2,0.124,0.136,0.21],
"keng":[0.21,0.134,0.148,0.218],
"kong":[0.172,0.11,0.124,0.176],
"kou":[0.204,0.126,0.135,0.208],
"ku":[0.146,0.093,0.096,0.154],
"kua":[0.282,0.17,0.158,0.286],
"kuai":[0.26,0.136,0.148,0.274],
"kuan":[0.24,0.15,0.159,0.254],
"kuang":[0.242,0.145,0.152,0.246],
"kui":[0.16,0.102,0.133,0.162],
"kun":[0.17,0.107,0.116,0.174],
"kuo":[0.186,0.114,0.108,0.186],
"la":[0.272,0.174,0.158,0.28],
"lai":[0.263,0.152,0.142,0.259],
"lan":[0.273,0.172,0.158,0.266],
"lang":[0.264,0.166,0.17,0.271],
"lao":[0.244,0.156,0.158,0.243],
"le":[0.177,0.121,0.104,0.173],
"lei":[0.18,0.119,0.111,0.19],
"leng":[0.204,0.141,0.143,0.203],
"li":[0.14,0.097,0.089,0.138],
"lia":[0.26,0.171,0.152,0.27],
"lian":[0.18,0.115,0.112,0.17],
"liang":[0.27,0.169,0.154,0.264],
"liao":[0.244,0.158,0.14,0.222],
"lie":[0.165,0.106,0.094,0.165],
"lin":[0.155,0.1,0.098,0.144],
"ling":[0.158,0.108,0.108,0.15],
"liu":[0.158,0.112,0.11,0.156],
"long":[0.165,0.116,0.119,0.16],
"lou":[0.198,0.133,0.13,0.192],
"lu":[0.14,0.099,0.09,0.139],
"luan":[0.233,0.156,0.154,0.238],
"lun":[0.164,0.113,0.111,0.158],
"luo":[0.18,0.121,0.103,0.17],
"lv":[0.137,0.094,0.087,0.136],
"lve":[0.172,0.117,0.104,0.165],
"ma":[0.26,0.166,0.148,0.265],
"mai":[0.25,0.144,0.131,0.244],
"man":[0.26,0.164,0.146,0.251],
"mang":[0.251,0.158,0.159,0.256],
"mao":[0.231,0.148,0.147,0.228],
"me":[0.164,0.113,0.092,0.158],
"mei":[0.167,0.111,0.1,0.176],
"men":[0.182,0.122,0.119,0.18],
"meng":[0.191,0.133,0.132,0.188],
"mi":[0.128,0.089,0.078,0.124],
"mian":[0.167,0.108,0.101,0.156],
"miao":[0.232,0.15,0.128,0.208],
"mie":[0.153,0.098,0.083,0.151],
"min":[0.142,0.092,0.088,0.129],
"ming":[0.146,0.1,0.096,0.135],
"miu":[0.146,0.105,0.099,0.142],
"mo":[0.176,0.13,0.096,0.171],
"mou":[0.185,0.125,0.118,0.178],
"mu":[0.128,0.092,0.08,0.124],
"na":[0.257,0.164,0.145,0.263],
"nai":[0.248,0.142,0.128,0.242],
"nan":[0.258,0.162,0.144,0.249],
"nang":[0.248,0.156,0.156,0.254],
"nao":[0.228,0.146,0.144,0.226],
"ne":[0.161,0.111,0.09,0.156],
"nei":[0.164,0.109,0.098,0.174],
"nen":[0.178,0.12,0.116,0.178],
"neng":[0.188,0.131,0.129,0.186],
"ni":[0.125,0.087,0.075,0.122],
"nian":[0.164,0.106,0.098,0.154],
"niang":[0.254,0.159,0.141,0.248],
"niao":[0.228,0.148,0.126,0.206],
"nie":[0.15,0.096,0.08,0.149],
"nin":[0.139,0.09,0.085,0.127],
"ning":[0.143,0.098,0.094,0.133],
"niu":[0.143,0.103,0.096,0.139],
"nong":[0.15,0.106,0.105,0.144],
"nu":[0.124,0.09,0.077,0.122],
"nuan":[0.218,0.147,0.14,0.222],
"nuo":[0.164,0.111,0.089,0.154],
"nv":[0.122,0.084,0.073,0.12],
"nve":[0.156,0.107,0.09,0.149],
"ou":[0.185,0.102,0.108,0.166],
"pa":[0.296,0.169,0.158,0.288],
"pai":[0.286,0.147,0.141,0.267],
"pan":[0.296,0.166,0.156,0.274],
"pang":[0.286,0.162,0.169,0.279],
"pao":[0.266,0.151,0.157,0.251],
"pei":[0.202,0.114,0.11,0.198],
"pen":[0.217,0.126,0.129,0.203],
"peng":[0.226,0.136,0.142,0.211],
"pi":[0.164,0.092,0.088,0.146],
"pian":[0.202,0.11,0.111,0.178],
"piao":[0.267,0.153,0.138,0.23],
"pie":[0.188,0.101,0.093,0.174],
"pin":[0.178,0.096,0.098,0.152],
"ping":[0.182,0.103,0.107,0.158],
"po":[0.212,0.134,0.106,0.194],
"pou":[0.22,0.128,0.128,0.2],
"pu":[0.163,0.094,0.09,0.147],
"qi":[0.12,0.065,0.061,0.118],
"qia":[0.238,0.139,0.124,0.248],
"qian":[0.158,0.083,0.084,0.15],
"qiang":[0.248,0.137,0.127,0.243],
"qiao":[0.223,0.126,0.112,0.201],
"qie":[0.145,0.074,0.066,0.145],
"qin":[0.134,0.068,0.071,0.122],
"qing":[0.138,0.076,0.08,0.128],
"qiong":[0.131,0.073,0.075,0.129],
"qiu":[0.138,0.08,0.082,0.135],
"qv":[0.116,0.062,0.059,0.116],
"qvan":[0.166,0.094,0.096,0.16],
"qve":[0.151,0.085,0.076,0.145],
"qvn":[0.14,0.077,0.076,0.128],
"ran":[0.26,0.164,0.174,0.251],
"rang":[0.25,0.158,0.186,0.256],
"rao":[0.23,0.148,0.174,0.228],
"re":[0.164,0.113,0.12,0.158],
"ren":[0.181,0.122,0.146,0.18],
"reng":[0.19,0.133,0.158,0.188],
"ri":[0.128,0.089,0.105,0.124],
"rong":[0.152,0.108,0.134,0.146],
"rou":[0.184,0.125,0.146,0.178],
"ru":[0.127,0.092,0.107,0.124],
"ruan":[0.22,0.149,0.17,0.224],
"rui":[0.142,0.1,0.144,0.132],
"run":[0.151,0.106,0.127,0.144],
"ruo":[0.167,0.113,0.119,0.156],
"sa":[0.258,0.163,0.152,0.266],
"sai":[0.249,0.14,0.136,0.245],
"san":[0.259,0.16,0.151,0.252],
"sang":[0.25,0.156,0.163,0.257],
"sao":[0.23,0.145,0.152,0.229],
"se":[0.163,0.11,0.097,0.159],
"sen":[0.18,0.12,0.124,0.181],
"seng":[0.19,0.13,0.136,0.189],
"sha":[0.282,0.173,0.154,0.295],
"shai":[0.272,0.15,0.138,0.274],
"shan":[0.283,0.17,0.153,0.28],
"shang":[0.273,0.165,0.165,0.286],
"shao":[0.253,0.154,0.154,0.258],
"she":[0.186,0.12,0.099,0.188],
"shen":[0.204,0.129,0.126,0.21],
"sheng":[0.213,0.14,0.138,0.218],
"shi":[0.15,0.096,0.084,0.154],
"shou":[0.207,0.132,0.125,0.207],
"shu":[0.15,0.098,0.086,0.154],
"shua":[0.286,0.175,0.148,0.286],
"shuai":[0.264,0.142,0.138,0.274],
"shuan":[0.243,0.155,0.15,0.254],
"shuang":[0.245,0.15,0.142,0.246],
"shui":[0.164,0.106,0.123,0.162],
"shun":[0.174,0.112,0.106,0.174],
"shuo":[0.19,0.12,0.098,0.185],
"si":[0.126,0.086,0.082,0.124],
"song":[0.152,0.106,0.112,0.146],
"sou":[0.184,0.122,0.123,0.178],
"su":[0.126,0.088,0.084,0.125],
"suan":[0.22,0.146,0.148,0.224],
"sui":[0.14,0.097,0.121,0.133],
"sun":[0.15,0.103,0.104,0.144],
"suo":[0.166,0.11,0.096,0.156],
"ta":[0.262,0.161,0.146,0.266],
"tai":[0.252,0.138,0.13,0.245],
"tan":[0.262,0.158,0.146,0.252],
"tang":[0.253,0.154,0.158,0.257],
"tao":[0.233,0.143,0.146,0.229],
"te":[0.166,0.108,0.092,0.159],
"teng":[0.193,0.128,0.13,0.189],
"ti":[0.13,0.084,0.076,0.124],
"tian":[0.169,0.102,0.1,0.156],
"tiao":[0.234,0.145,0.128,0.208],
"tie":[0.155,0.093,0.082,0.152],
"ting":[0.148,0.094,0.096,0.136],
"tong":[0.155,0.104,0.107,0.146],
"tou":[0.187,0.12,0.118,0.178],
"tu":[0.13,0.086,0.078,0.125],
"tuan":[0.223,0.144,0.142,0.224],
"tui":[0.144,0.095,0.115,0.133],
"tun":[0.154,0.1,0.099,0.144],
"tuo":[0.169,0.108,0.09,0.156],
"wa":[0.258,0.165,0.15,0.27],
"wai":[0.248,0.142,0.134,0.25],
"wan":[0.258,0.162,0.15,0.256],
"wang":[0.248,0.157,0.162,0.262],
"wei":[0.164,0.11,0.103,0.18],
"wen":[0.179,0.121,0.122,0.186],
"weng":[0.188,0.132,0.134,0.194],
"wo":[0.174,0.129,0.099,0.176],
"wu":[0.125,0.09,0.082,0.13],
"xi":[0.107,0.068,0.056,0.1],
"xia":[0.226,0.142,0.119,0.23],
"xian":[0.146,0.086,0.079,0.132],
"xiang":[0.236,0.14,0.122,0.225],
"xiao":[0.211,0.128,0.107,0.183],
"xie":[0.132,0.077,0.062,0.126],
"xin":[0.122,0.072,0.066,0.105],
"xing":[0.126,0.078,0.075,0.11],
"xiong":[0.119,0.076,0.07,0.111],
"xiu":[0.126,0.083,0.078,0.117],
"xv":[0.104,0.064,0.054,0.098],
"xvan":[0.154,0.098,0.09,0.142],
"xve":[0.138,0.088,0.071,0.126],
"xvn":[0.128,0.08,0.072,0.11],
"ya":[0.233,0.148,0.128,0.238],
"yan":[0.153,0.092,0.089,0.139],
"yang":[0.243,0.146,0.132,0.232],
"yao":[0.218,0.134,0.116,0.19],
"ye":[0.139,0.083,0.071,0.134],
"yi":[0.114,0.074,0.066,0.107],
"yin":[0.128,0.078,0.076,0.112],
"ying":[0.132,0.084,0.084,0.118],
"yong":[0.139,0.094,0.096,0.129],
"you":[0.171,0.11,0.106,0.16],
"yv":[0.11,0.07,0.064,0.105],
"yvan":[0.161,0.104,0.1,0.15],
"yve":[0.145,0.094,0.08,0.134],
"yvn":[0.134,0.086,0.081,0.118],
"za":[0.257,0.158,0.146,0.26],
"zai":[0.248,0.134,0.13,0.238],
"zan":[0.258,0.154,0.146,0.245],
"zang":[0.248,0.15,0.158,0.25],
"zao":[0.228,0.139,0.146,0.223],
"ze":[0.161,0.104,0.092,0.152],
"zei":[0.164,0.102,0.099,0.169],
"zen":[0.178,0.114,0.118,0.174],
"zeng":[0.188,0.124,0.13,0.182],
"zha":[0.282,0.166,0.156,0.282],
"zhai":[0.272,0.144,0.139,0.262],
"zhan":[0.282,0.164,0.154,0.268],
"zhang":[0.272,0.158,0.167,0.274],
"zhao":[0.252,0.148,0.155,0.246],
"zhe":[0.186,0.113,0.1,0.176],
"zhen":[0.203,0.122,0.127,0.198],
"zheng":[0.213,0.133,0.14,0.206],
"zhi":[0.15,0.089,0.086,0.141],
"zhong":[0.174,0.108,0.116,0.163],
"zhou":[0.207,0.125,0.126,0.194],
"zhu":[0.149,0.092,0.088,0.142],
"zhua":[0.286,0.168,0.15,0.273],
"zhuai":[0.263,0.135,0.139,0.262],
"zhuan":[0.242,0.149,0.151,0.241],
"zhuang":[0.244,0.144,0.144,0.233],
"zhui":[0.164,0.1,0.124,0.15],
"zhun":[0.173,0.106,0.108,0.161],
"zhuo":[0.189,0.113,0.1,0.172],
"zi":[0.125,0.08,0.076,0.118],
"zong":[0.15,0.1,0.107,0.14],
"zou":[0.182,0.116,0.118,0.172],
"zu":[0.124,0.082,0.078,0.118],
"zuan":[0.218,0.14,0.142,0.218],
"zui":[0.139,0.091,0.115,0.126],
"zun":[0.148,0.096,0.099,0.138],
"zuo":[0.164,0.104,0.09,0.15]
		};
}