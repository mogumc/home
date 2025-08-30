# home
Vue实现的单html文件个人主页  
额外提供了统一UI的错误页/音乐播放器/网址集  
[部署教程](https://blog.moguq.top/posts/25080701/)

# 页面
<img width="1306" height="795" alt="cut" src="https://pic.moguq.top/images/250807-home01.png" />

## 功能
**支持 *（主页面）***
- [x] 载入动画
- [x] 站点简介
- [x] Hitokoto 一言
- [x] 日期及时间
- [x] 响应式界面

**额外支持 *（独立页面）***
- [x] 网址集
- [x] 音乐播放器
- [x] 错误页(40X、50X) 

 **ToDo *（还未实装）***
 - [ ] 统一Json储存数据
 - [ ] 合并CSS、JS实现复用
 - [ ] 更流畅的载入动画
       
## Demo

> 由于 CDN 缓存原因，查看最新效果可能需要 `Ctrl` + `F5` 强制刷新浏览器缓存

- [蘑菇の主页 - EO](https://www.moguq.top)
- [蘑菇の主页 - CF](https://moguq.top)

# 修改
在文件中找到以下字段  
<img width="622" height="161" alt="image" src="https://pic.moguq.top/images/250807-home02.png" />

在``sites``字段与``socials``中按格式添加  
name： 显示的文字 icon: 使用bootstrap-icons库,默认版本为1.13.1(如需使用新版本图标请修改cdn地址) url: 点击跳转的地址  
```
{ name: "博客", icon: 'bootstrap-fill', url: 'https://blog.moguq.top' },
```

# 灵感来源
[imsyy - home](https://github.com/imsyy/home)  
由npmcn提供js与css的CDN  
由次元API提供背景  
由Hitokoto提供一言  

# License
MIT License
