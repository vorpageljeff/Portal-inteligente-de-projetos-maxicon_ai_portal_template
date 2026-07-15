import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
void main()=>runApp(const App());
class App extends StatelessWidget{const App({super.key});@override Widget build(BuildContext c)=>MaterialApp(title:'Portal de Projetos',theme:ThemeData(useMaterial3:true),home:const Projects());}
class Projects extends StatefulWidget{const Projects({super.key});@override State<Projects> createState()=>_ProjectsState();}
class _ProjectsState extends State<Projects>{late Future<List<dynamic>> data;@override void initState(){super.initState();data=load();}Future<List<dynamic>> load()async{const api=String.fromEnvironment('API_URL',defaultValue:'http://10.0.2.2:8000');final r=await http.get(Uri.parse('$api/api/v1/projects'));if(r.statusCode!=200)throw Exception('Erro ao carregar projetos');return jsonDecode(r.body);} @override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('Meus projetos')),body:FutureBuilder<List<dynamic>>(future:data,builder:(c,s){if(!s.hasData)return const Center(child:CircularProgressIndicator());return ListView(children:s.data!.map((p)=>ListTile(title:Text(p['name']),subtitle:Text(p['client_name']))).toList());}));}
