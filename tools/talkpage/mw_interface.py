import urllib, code, json, time, codecs, sqlite3, sys, codecs, subprocess

# Set up a User Agent string for our bot
class MWURLopener(urllib.FancyURLopener):
	version = "MWRevisionGrabber1.0"

# This method generates a list of database entries by parsing JSON data from the wikipedia API
# Each entry is in the following form:
# [ page title, page ID, Revision ID, Parent ID, User, UserID, timestamp, comment, diff ]
def entriesFromAPIResponse(opener, jdata):
	# Prepare the return list
	ret = []
	# A time older than any edit -- used as the initial timestamp to compare against
	lasttime = time.strptime("01 Jan 1970", "%d %b %Y")
	
	# Iterate over each revision
	for revision in jdata['query']['pages'].values()[0]['revisions']:
		entry = []
		
		# Check if this result is extraneous due to it coming before the previous result.
		curtime = time.strptime(revision['timestamp'][:-1], "%Y-%m-%dT%H:%M:%S")
		if curtime <= lasttime:
			return ret # Terminate, as the extraneous result indicates that there are no more relevant results.
		lasttime = curtime
		
		# Append the article title
		entry.append(jdata['query']['pages'].values()[0]['title'])
		#Append the article ID
		entry.append(jdata['query']['pages'].values()[0]['pageid'])
		# Append the article revision ID
		entry.append(revision['revid'])
		# Append the parent ID
		entry.append(revision['parentid'])
		# Append User Data
		entry.append(revision['user'])
		entry.append(revision['userid'])
		# Append timestamp and edit comment
		entry.append(revision['timestamp'])
		entry.append(revision['comment'])
		
		# Append content
		entry.append(revision['*'])
		
		# Finally, append the completed entry
		ret.append(entry)
	return ret

# Function to fetch all the article revision data up to a given date / time
# Uses entriesFromAPIResponse to build a list of said revisions
def fetchRevisions(opener, art_title, art_enddate):

	# Common base string for all requests.
	fetchstr_base = ('http://en.wikipedia.org/w/api.php?'
	'action=query'
	'&prop=revisions'
	'&format=json'
	'&rvprop=ids%7Ctimestamp%7Cuser%7Cuserid%7Ccomment%7Ccontent'
	'&rvlimit=20'
	'&rvdir=newer')
	
	# Escape the article title for wikipedia
	title = urllib.quote(art_title)
	
	ret = []
	
	#TODO: encode enddate as yymmddhhmmss
	s = opener.open(fetchstr_base + "&titles=%s&rvend=%s"%(art_title, art_enddate))
	print 'opened initial: ' + fetchstr_base + "&titles=%s&rvend=%s"%(art_title, art_enddate)
	jdata = json.loads(s.read())
	s.close()
	
	# Add in the entries from the initial fetch
	ret.extend(entriesFromAPIResponse(opener, jdata))
	
	# Continue querying until there is no more data to be had.
	while 'query-continue' in jdata:
		print '\tFetching ~20 more entries . . .'
		s = opener.open(fetchstr_base + "&titles=%s&rvend=%s&rvstartid=%s"%(art_title, art_enddate, jdata['query-continue']['revisions']['rvcontinue']))
		print 'opened ' + fetchstr_base + "&titles=%s&rvend=%s&rvstartid=%s"%(art_title, art_enddate, jdata['query-continue']['revisions']['rvcontinue'])
		jdata = json.loads(s.read())
		s.close()
		ret.extend(entriesFromAPIResponse(opener, jdata))
	
	return ret

def log(info):
	print info
	with open('errorlog.txt', 'a') as log:
		log.write(info + '\n')

def printentry(e):
	with codecs.open('out.html', encoding='utf-8', mode='a') as of:
		i = 0
		for field in ('title', 'pageid', 'revid', 'parentid', 'user', 'userid', 'timestamp', 'comment', 'content'):
			of.write(field+': ')
			of.write(unicode(e[i]))
			of.write('\n')
			i += 1

def main():
	args = sys.argv
	
	if len(args) != 3:
		print 'Usage: %s "Article Title" start_time_stamp' % args[0]
		quit()
	
	enddate = 0
	
	try:
		enddate = int(args[2])
	except ValueError:
		log('Error! Invalid end date time stamp for the following article:\n')
		log('\t%s (end date %s)\n' % (args[1], args[2]))
		quit()
	
	entries = []
	
	print 'Fetching entries for article %s . . .' % args[1]
	
	try:
		entries = fetchRevisions(MWURLopener(), args[1], enddate)
	except:
		log('Error! Could not fetch revisions for the following article:')
		log('\t%s (end date %d)' % (args[1], enddate))
		quit()
	
	print 'Fetched %d entries.' % len(entries)
	
	#for e in entries: printentry(e)
	
	prev = ""
	id = 1
	for e in entries:
		cur = e[8]
		f,g = codecs.open('prev.txt', 'w', encoding='utf-8'), codecs.open('cur.txt', 'w', encoding='utf-8')
		f.write(unicode(prev))
		g.write(unicode(cur))
		prev = cur
		f.close()
		g.close()
		proc = subprocess.Popen('levenshtein.exe prev.txt cur.txt', shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
		count = 0
		for line in proc.stdout.readlines():
			count = int(line.strip())
		print 'UPDATE talkpages_simple SET lev='+str(count)+' WHERE id='+str(id)+';'
		id += 1
	
	quit()

if __name__ == "__main__":
	main()
	
code.interact("Interactive",local=locals())