# NEON

マークダウン言語による高速なHP作成ソフト

## NEONとは

[NEON LOGO](https://github.com/hotstaff/neon/blob/master/demo/neon.png)

NEONは作者のコンピュータが時代遅れになり、ウェブページのロードが日増しに遅くなりさらにはWEBページに広告が溢れていく現代の状況に鑑み。状況を打破するために制作しようとしている超高速ロード・タイムを目指したウェブページ製作ソフトウェアです。実際には2000年の自作HP製作時代への巻き戻しを意味しています。製作者は超高速ウェブページを制作できる代わりに、閲覧者は２０年前へタイムスリップしたかのようなエクスペリエンスを実感できます。

## 注意
**現在はまだ開発の初期段階です。**

## 性能
２０１８年現在のコンピュータではおそらく０．１秒台で表示できます。

## Markdown言語によるHPの記述
HPは手書きのhtmlを書く代わりにgithubやQiitaのようなmarkdown言語で記述します。

## インストール

画像をサムネイルに変換する機能をつけているため
GraphicsMagickをインストールする必要があります。

### ubuntuの場合
```bash
apt install gm
```

```bash
git clone --depth=1 https://github.com/hotstaff/neon.git
cd neon
npm install
```

## デモページのビルド

```
npm run demo-build
```

## プルリクエストについて

是非送ってください。

## Licence
MIT

## 作者
万城 秀人
