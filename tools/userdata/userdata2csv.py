# Same as other script but goes back to wikipedia to gather the userids
import sqlite3, csv, urllib, json

conn = sqlite3.connect('henry_articles_users.db')
c = conn.cursor()
d = conn.cursor()

g_histid=0
g_listid=0
luid=0

users = []
users_grouphistory = []
users_grouplists = []

# Set up a User Agent string for our bot
class MWURLopener(urllib.FancyURLopener):
	version = "MWRightsHistoryGrabber1.0"

class MWInterface:
	def __init__(self, baseurl):
		self.baseurl = baseurl
		self.opener = MWURLopener()
	
	def request(self, **kwargs):
		params = {}
		for k in kwargs:
			if isinstance(kwargs[k], (list, tuple)):
				p = '|'.join(kwargs[k])
			else:
				p = kwargs[k]
			params[k] = p
		#print self.baseurl+urllib.urlencode(params)
		s = self.opener.open(self.baseurl+urllib.urlencode(params))
		jdata = json.loads(s.read())
		s.close()
		return jdata

i = 0

iface = MWInterface("http://en.wikipedia.org/w/api.php?")

for row in c.execute('SELECT distinct user from users'):
	i += 1
	if i%100 == 0: print 'Processing user #%d\t(%f%%)' %(i, i/656.0*100.0)
	user = row[0]
	try:
		resp = iface.request(action='query', list='users', format='json', ususers=user)['query']['users'][0]
		if 'invalid' in resp: userid = 0
		else: userid = resp['userid']
	except:
		print 'Error fetching userid for user ' + user
		continue
	#print user, userid
	flagged = False
	for entry in d.execute('SELECT timestamp,grouplist,userclass,flagged from users where user=?', (user, )):
		if entry[3] != 0: flagged=True
		for group in entry[1].split(','):
			users_grouplists.append((luid, g_listid, group))
			luid += 1
		users_grouphistory.append((g_histid, g_listid, entry[0], entry[2]))
		g_listid += 1
	users.append((userid, user, g_histid, flagged))
	g_histid += 1

ufile = csv.writer(open('users.csv', 'wb'), quoting=csv.QUOTE_NONNUMERIC)
gfile = csv.writer(open('users_grouphistory.csv', 'wb'), quoting=csv.QUOTE_NONNUMERIC)
lfile = csv.writer(open('users_grouplists.csv', 'wb'), quoting=csv.QUOTE_NONNUMERIC)

for e in users:
	ufile.writerow(e)
for e in users_grouphistory:
	gfile.writerow(e)
for e in users_grouplists:
	lfile.writerow(e)