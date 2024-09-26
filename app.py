from flask import Flask, redirect, render_template, request, session, jsonify
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

app.config['SECRET_KEY'] = 'your_secret_key_here' #need to see what this is for later

# Set sessions to be permanent (not cleared on browser close)
app.config['SESSION_PERMANENT'] = False  # False means the session lasts as long as the browser is open.

@app.route("/")
def index():
    return render_template("homepage.html")

@app.route("/whatwedo")
def route1():
    return render_template("whatwedo.html")

@app.route("/join")
def route2():
    return render_template("signup.html")

@app.route("/talk")
def route3():
    return render_template("contact.html")





@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "GET":
        return render_template("signup.html")
    elif request.method == "POST":
        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]
        
        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor() #create a cursor that can find things in db

                sql_check = "SELECT * FROM users WHERE email = %s"
                cursor.execute(sql_check, (email,)) #find an account with this email address
                result = cursor.fetchone() #fetches first row (should only be one)

                if result: 
                    cursor.close()
                    connection.close()
                    return redirect("/login") #should find a better way to do this !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            
                else: #doesnt exist
                    sql_insert = "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)"
                    
                    cursor.execute(sql_insert, (name, email, password))
                    connection.commit() #git logic
                    cursor.close()
                    connection.close()
                
                return redirect("/login") #Prevents form resubmission -- goes to next step
        
        except Error as error_message:
            print(f"Error: {error_message}")
            return render_template("/") # Optionally render an error template or redirect to an error page
        
    return redirect("/") #for anything else than get or post -- not sure it happens a lot at all

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")

    elif request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        if 'user_id' in session and session['email'] != email: #check to see if when submitting the form again  that the credentials match
            session.clear()  # Clears the session to remove previous login details

        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor()

                sql = "SELECT * FROM users WHERE email = %s AND password = %s"
                cursor.execute(sql, (email, password))
                
                result = cursor.fetchone() #one row
                
                if result:
                    # Login successful
                    session['user_id'] = result[0]  # store data in session array that you can access anywhere
                    session['name'] = result[1]   
                    session['email'] = result[2]
                    cursor.close()
                    connection.close() 

                    return redirect("/hub")  # Redirect to hub 
                else:
                    # Login failed
                    return render_template("login.html", error=True) #need to find a better way of doing this!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        
        except Error as error_message:
            print(f"Error: {error_message}")
            return render_template("homepage.html")
        
    return redirect("/") #prob will never be needed


#FROM HERE ON, NEED TO BE CAREFUL THAT YOU ARE LOGGED IN BEFORE YOU DO ANYTHING ###########################################################


@app.route("/hub")
def hub():
    if 'user_id' in session: #check to see if session is active just in case someone /hubs 
        name = session["name"]

        return render_template("hub.html", name=name) #customize the hub
    else:
        # If user is not logged in, redirect to login page
        return redirect("/login") #facts chatgbt, you tell em gurl

@app.route("/hub-student")
def hub_student():
    return render_template("hub_student.html", name = session["name"]) #this will through an error if someone tries to /into this. (could put if user in session)


@app.route("/hub-tutor")
def hub_tutor():
    return render_template("hub_tutor.html", name = session["name"]) #this will through an error if someone tries to /into this. (could put if user in session)




@app.route("/tutor-profile", methods=["GET", "POST"])
def tutor_profile():
    if request.method == "GET":
        return render_template("tutor_profile.html")
    elif request.method == "POST":
        if 'user_id' in session: #check to see if session is active just in case someone /hubs 
            age = request.form["age"]
            university = request.form["university"]
            course = request.form["course"]
            about_me = request.form["about_me"]
            subjects = request.form["subjects"]
            availability = request.form["availability"]

            user_id = session["user_id"]
            name = session["name"]

            try:
                # Connect to the database
                connection = mysql.connector.connect(
                    host='localhost',          # e.g., 'localhost' or an IP address
                    user='root',      # your database username
                    password='Kikidi25',  # your database password
                    database='users_tutoring'   # the name of your database
                )
                
                if connection.is_connected():
                    cursor = connection.cursor()

                    sql = "SELECT * FROM tutor_profiles WHERE user_id = %s "
                    cursor.execute(sql, (user_id,))
                    
                    result = cursor.fetchone() #one row
                    
                    if result:  # Profile exists, update it
                        sql = """
                            UPDATE tutor_profiles
                            SET age = %s, university = %s, course = %s, about_me = %s,
                                subjects = %s, availability = %s
                            WHERE user_id = %s
                        """
                        cursor.execute(sql, (age, university, course, about_me, subjects, availability, user_id))
                    else:  # Profile does not exist, insert new
                        sql = """
                            INSERT INTO tutor_profiles (user_id, age, university, course, about_me, subjects, availability)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """
                        cursor.execute(sql, (user_id, age, university, course, about_me, subjects, availability))
                    
                    connection.commit()  # Commit the transaction
                    cursor.close()
                    connection.close()
                    
                    return redirect("/hub-tutor")  # Redirect to hub
                   
            except Error as error_message:
                print(f"Error: {error_message}")
                return render_template("homepage.html")

        else:
            # If user is not logged in, redirect to login page
            return redirect("/login") #facts chatgbt, you tell em gurl
            
        
    return redirect("/") #prob will never be needed


@app.route ("/find-tutor", methods=["GET", "POST"])
def find_tutors():
    if request.method == "GET":
        if 'user_id' in session: #check to see if session is active just in case someone /find-tutors

            try:
                    # Connect to the database
                    connection = mysql.connector.connect(
                        host='localhost',          # e.g., 'localhost' or an IP address
                        user='root',      # your database username
                        password='Kikidi25',  # your database password
                        database='users_tutoring'   # the name of your database
                    )
                    
                    if connection.is_connected():
                        cursor = connection.cursor()

                        query1 = "SELECT DISTINCT subjects FROM tutor_profiles ORDER BY subjects ASC" #give you all distinct subjects for filter
                        query2 = "SELECT DISTINCT university FROM tutor_profiles ORDER BY university ASC" #give you all distinct unis for filter

                        query3 = "SELECT * FROM users JOIN tutor_profiles ON users.id = tutor_profiles.user_id" #to give you all the data you need (name is [1] email[2])

                        
                        cursor.execute(query1)
                        subjects = cursor.fetchall() #fetch all rows
        
                        cursor.execute(query2)
                        unis = cursor.fetchall()
                        
                        cursor.execute(query3)
                        tutors = cursor.fetchall()

                        connection.commit()  # Commit the transaction
                        cursor.close()
                        connection.close()

                        # Pass the list of tutors to the template
                        return render_template("find_tutors.html", subjects=subjects, unis=unis, tutors=tutors)
                    
            except Error as error_message:
                print(f"Error: {error_message}")
                return render_template("homepage.html")
            
        else:
            return render_template("/signup.html")
        
    # elif request.method == "POST":
    #     selected_university = request.form["university"] #because of jinja
    #     selected_subject = request.form["subject"] #because of jinja
    #     print(selected_subject)
    #     print(selected_university)

    #     try:
    #             # Connect to the database
    #             connection = mysql.connector.connect(
    #                 host='localhost',          # e.g., 'localhost' or an IP address
    #                 user='root',      # your database username
    #                 password='Kikidi25',  # your database password
    #                 database='users_tutoring'   # the name of your database
    #             )
                
    #             if connection.is_connected():
    #                 cursor = connection.cursor()

    #                 query1 = "SELECT DISTINCT subjects FROM tutor_profiles ORDER BY subjects ASC" #give you all distinct subjects for filter
    #                 query2 = "SELECT DISTINCT university FROM tutor_profiles ORDER BY university ASC" #give you all distinct unis for filter

    #                 query3 = "SELECT * FROM users   JOIN tutor_profiles ON users.id = tutor_profiles.user_id  WHERE tutor_profiles.university = %s AND  tutor_profiles.subjects = %s" #to give you all the data you need (name is [1] email[2])

                    
    #                 cursor.execute(query1)
    #                 subjects = cursor.fetchall() #fetch all rows
    
    #                 cursor.execute(query2)
    #                 unis = cursor.fetchall()
                    
    #                 cursor.execute(query3, (selected_university, selected_subject))
    #                 tutors = cursor.fetchall()
    #                 print(tutors)

    #                 connection.commit()  # Commit the transaction
    #                 cursor.close()
    #                 connection.close()

    #                 # Pass the list of tutors to the template
    #                 return render_template("find_tutors.html", subjects=subjects, unis=unis, tutors=tutors)
                    
    #     except Error as error_message:
    #         print(f"Error: {error_message}")
    #         return render_template("homepage.html")

    
    else:
        return render_template("homepage.html")
    

@app.route('/find-tutor-ajax', methods=['POST'])
def find_tutor_ajax():
    if request.content_type != 'application/json':
        return jsonify({'error': 'Invalid Content-Type. Expected application/json'}), 400

    data = request.get_json()  # Get the JSON data sent from the client
    selected_university = data.get('university', '').strip()  # Get selected university
    selected_subject = data.get('subject', '').strip()  # Get selected subject

    try:
        # Connect to the database
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Kikidi25',
            database='users_tutoring'
        )

        if connection.is_connected():
            cursor = connection.cursor()

            # Prepare the SQL query
            query3 = "SELECT * FROM users JOIN tutor_profiles ON users.id = tutor_profiles.user_id WHERE 1=1"
            filters = []

            # Add filters based on user input
            if selected_university:
                query3 += " AND tutor_profiles.university = %s"
                filters.append(selected_university)

            if selected_subject:
                query3 += " AND tutor_profiles.subjects = %s"
                filters.append(selected_subject)

            # Execute the query
            cursor.execute(query3, tuple(filters))
            tutors = cursor.fetchall()
            print(tutors)

            # Return the data as a JSON response
            return jsonify({'tutors': tutors})

    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()