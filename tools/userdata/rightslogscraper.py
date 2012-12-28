import urllib2, urllib, time
from bs4 import BeautifulSoup

import code, json, sqlite3, sys

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
		

def getDefaultRights(iface, uname):
	groups = []
	defaulttime = time.strptime("01 Jan 1970", "%d %b %Y") # Time to use for 'default' entries
	
	# Retrieve current rights first. If we get a field back named 'invalid', the user is anon, and has groups '*'
	# Otherwise, we start the user off with the groups '*' and 'user'
	resp = iface.request(action='query', list='users', format='json', usprop='groups', ususers=[uname])
	rdata = resp['query']['users'][0]
	
	if 'missing' in rdata:
		groups.append((defaulttime, ['*']))
		return groups
	groups.append((defaulttime, ['*', 'user']))
	
	# uhresp = iface.request(
		# action='query',
		# list='logevents',
		# format='json',
		# leprop=['title', 'user', 'userid', 'timestamp', 'details'],
		# letype='rights',
		# lelimit='100',
		# ledir='newer',
		# letitle='User:%s'%uname)
	
	# uhdata = uhresp['query']['logevents']
	# for le in uhdata:
		# if 'rights' not in le: continue
		# etime = time.strptime(le['timestamp'], '%Y-%m-%dT%H:%M:%SZ')
		# egroups = groups[-1][1][:]
		# for o in [g.strip() for g in le['rights']['old'].split(',')]:
			# if o and o in egroups: egroups.remove(o)
		# for n in [g.strip() for g in le['rights']['new'].split(',')]:
			# if n and n not in egroups: egroups.append(n)
		# groups.append((etime, egroups))
	
	# Append current set of rights for reference. There may be discrepancies, so this will need to be sorted out.
	groups.append((time.gmtime(), rdata["groups"]))
	
	return groups

def classifyUser(glist):
	if 'bot' in glist: return 'Bot'
	if any(g in glist for g in ['sysop', 'bureaucrat', 'steward', 'accountcreator', 'abusefilter', 'oversight', 'checkuser',
		'afttest-hide', 'afttest', 'founder', 'ombudsman', 'reviewer']):
		return 'Admin'
	if any(g in glist for g in ['rollbacker', 'autoreviewer', 'filemover', 'researcher']):
		return 'Power User'
	if any(g in glist for g in ['user', 'confirmed', 'autoconfirmed']):
		return 'User'
	return 'Anon'

def isFlagged(grouplog):
	grouplog = sorted(grouplog, key = lambda le: le[0])
	if len(grouplog) == 1: return False
	if classifyUser(grouplog[-1][1]) == classifyUser(grouplog[-2][1]):
		return False
	return True

def displayGroupLog(grouplog):
	grouplog = sorted(grouplog, key = lambda le: le[0])
	for (t,e) in grouplog:
		print time.strftime('%Y-%m-%dT%H:%M:%SZ', t) + '\t' + ','.join(e) + '\t' + classifyUser(e)
	print 'Flagged: ' + str(isFlagged(grouplog))

# Convert names used in the log file format to those used in the API
def convGroup(g):
		g = g.replace('administrator', 'sysop')
		g = g.replace('edit filter manager', 'abusefilter')
		g = g.replace('account creator', 'accountcreator')
		g = g.replace('autopatrolled', 'autoreviewer')
		g = g.replace('IP block exempt', 'ipblock-exempt')
		g = g.replace('file mover', 'filemover')
		return g

def checkGroupList(user, glists):
	for glist in glists:
		for g in glist:
			if g not in ['sysop', 'bureaucrat', 'steward', 'accountcreator', 'abusefilter', 'oversight', 'checkuser',
			'afttest-hide', 'afttest', 'founder', 'ombudsman', 'rollbacker', 'autoreviewer', 'filemover', 'researcher',
			'user', 'confirmed', 'autoconfirmed', 'bot', '*', 'reviewer', 'ipblock-exempt']:
				f = open('errlog.txt', 'a')
				f.write('Error: Unidentified group %s for user %s.\n' % (g, user))
				f.close()

def getLogRightsHistory(user):
	print 'Getting log rights'
	iface = MWInterface('http://en.wikipedia.org/w/api.php?')
	
	groups = getDefaultRights(iface, user)
	if len(groups) <= 1: return groups
	url = ('http://en.wikipedia.org/w/index.php?title=Special:Log&dir=prev&type=rights&user=&page=' + 
		urllib.quote_plus(user) + '&tagfilter=')
	headers = {'User-Agent' : 'Mozilla/4.0 (compatible; MSIE 5.5; Windows NT)'}
	req = urllib2.Request(url, '', headers)
	html = urllib2.urlopen(req).read()


	soup = BeautifulSoup(html)
	entries = soup.find_all("li", {"class": "mw-logline-rights"})
	
	for e in entries:
		s = e.text
		indl = s.find(' to ', s.index('from'))+4
		indr = s.find('(', indl)
		groupstr = s[indl:indr].replace(' and', ',')
		glist = ['*', 'user']
		glist.extend([convGroup(g.strip()) for g in groupstr.split(', ') if g])
		if len(glist) == 2:
			lbrack = s.rfind('(')
			rbrack = s.rfind(')')
			if lbrack != -1 and rbrack != -1 and s[lbrack+1] == '+':
				glist.extend([g for g in s[lbrack+1:rbrack].replace('+', '').split() if g])
		groups.append((time.strptime(' '.join(e.text.split()[:4]), '%H:%M, %d %B %Y'), glist))
	
	return groups

def getAPIRightsHistory(uname):
	iface = MWInterface('http://en.wikipedia.org/w/api.php?')
	groups = []
	defaulttime = time.strptime("01 Jan 1970", "%d %b %Y") # Time to use for 'default' entries
	
	# Retrieve current rights first. If we get a field back named 'invalid', the user is anon, and has groups '*'
	# Otherwise, we start the user off with the groups '*' and 'user'
	resp = iface.request(action='query', list='users', format='json', usprop='groups', ususers=[uname])
	rdata = resp['query']['users'][0]
	
	if 'missing' in rdata or 'invalid' in rdata:
		groups.append((defaulttime, ['*']))
		return groups
	groups.append((defaulttime, ['*', 'user']))
	
	uhresp = iface.request(
		action='query',
		list='logevents',
		format='json',
		leprop=['title', 'user', 'userid', 'timestamp', 'details'],
		letype='rights',
		lelimit='100',
		ledir='newer',
		letitle='User:%s'%uname)
	
	uhdata = uhresp['query']['logevents']
	for le in uhdata:
		if 'rights' not in le: continue
		etime = time.strptime(le['timestamp'], '%Y-%m-%dT%H:%M:%SZ')
		egroups = groups[-1][1][:]
		for o in [g.strip() for g in le['rights']['old'].split(',')]:
			if o and o in egroups: egroups.remove(o)
		for n in [g.strip() for g in le['rights']['new'].split(',')]:
			if n and n not in egroups: egroups.append(n)
		groups.append((etime, egroups))
	
	# Append current set of rights for reference. There may be discrepancies, so this will need to be sorted out.
	groups.append((time.gmtime(), rdata["groups"]))
	
	return groups

def mergeRightsHistory(histA, histB):
	history = histA
	for he in histB:
		# Next crazy line checks if the group list of the entry to be merged is already the group list of an element in histA
		# If so, we don't add this entry to the merged list (it "exists" already)
		if not any(map(lambda hae: all(map(lambda haeg: haeg in he[1], hae[1])),histA)):
			history.append(he)
	return sorted(history, key = lambda he: he[0])

if __name__ == "__main__":
	user = sys.argv[1]
	print 'Fetching rights history for ' + user + ' . . .'
	rightsHistory = getAPIRightsHistory(user)
	if classifyUser(rightsHistory[0][1]) != 'Anon':
		rightsHistory = mergeRightsHistory(getLogRightsHistory(user), rightsHistory)
	checkGroupList(user, map(lambda e: e[1], rightsHistory))
	displayGroupLog(rightsHistory)
	
	# Connect to sqlite3 DB and append user rights info
	conn = sqlite3.connect('articles_users.db')
	
	to_insert = [(user, time.strftime('%Y-%m-%dT%H:%M:%SZ', e[0]), ','.join(e[1]), classifyUser(e[1]), isFlagged(rightsHistory)) for e in rightsHistory]
	
	c = conn.cursor()
	
	c.executemany('INSERT INTO users VALUES (?,?,?,?,?)', to_insert)
	
	conn.commit()
	
	c.close()
	
	if (isFlagged(rightsHistory)):
		print 'User is flagged!'
	
	print '\n|||===SEPARATOR===|||\n'