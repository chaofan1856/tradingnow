import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
m=re.match(r'(<title>.*?</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n)', s, re.S)
head=m.group(1); body=s[len(head):]
doc='<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+head+'<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n</head>\n<body>\n'+body+'\n</body>\n</html>\n'
open(sys.argv[2],'w',encoding='utf-8').write(doc); print(doc.count('/_blob/'), '__MISSING__' in doc)
