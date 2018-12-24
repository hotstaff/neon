# NEONの使い方

# DEMOページのビルドとクリーン

NEONの簡単な使用方法を説明したページをビルドできます。

## build

``` 
npm run demo-build
```

実行するとdemoフォルダの中にindex.htmが作成されます。
スクリプトは変換後ファイルの変更をウォッチするので、mdファイルの更新があると自動で再出力されます。
終了する時には __Ctrl+c__ を押してください。

## clean

```
npm run demo-clean
```
demoフォルダの.htmファイルを削除します。
