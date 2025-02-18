import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import{ApiResponse} from '../utils/ApiResponse.js';

const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}

    }catch(error){
        throw new ApiError(500,"Token generation failed")
    }
}

const registerUser=asyncHandler(async (req,res)=>{
    //res.status(200).json({
        //message: "ok"
        const {fullname,email,username,password}=req.body
        console.log("Email ",email);

        if(fullname===""){
            throw new ApiError(400,"Fullname is required")
        }

        if([fullname,email,username,password].some((field)=>field?.trim()==="")){
            throw new ApiError(400,"All fields are required")
        }

        const existedError=await User.findOne({
            $or:[{email},{username}]
        })
        if(existedError){
            throw new ApiError(409,"Email or username already exists")
        }


        const avatarLocalPath=req.files?.avatar[0]?.path;
        //const coverImageLocalPath=req.files?.coverImage[0]?.path;
        let coverImageLocalPath;
        if( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
            coverImageLocalPath=req.files.coverImage[0].path;
        }



        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar is required")
        }

        const avatar=await uploadOnCloudinary(avatarLocalPath)
        const coverImage=await uploadOnCloudinary(coverImageLocalPath)

        if(!avatar)
        {
            throw new ApiError(400,"Avatar is required")
        }

        const user=await User.create({
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url || "", //if coverImage is not uploaded then set it to empty string
            email,
            password,
            username: username.toLowerCase()

        })

        const createdUser= await User.findById(user._id).select("-password -refreshToken")

        if(!createdUser){
            throw new ApiError(500,"User could not be registered")
        }
        
        
        const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
        const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
        const options={
            httpOnly:true,
            secure:true
        }
        return res.status(200).cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken}),
        "User registered successfully")
    
    })

    
//})

const loginUser=asyncHandler(async (req,res)=>{

    const {email, username, password}=req.body;
    if(!email && !username){
        throw new ApiError(400,"Email or username is required")
    }

    const user=await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"User not found")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid credentials")
    }
})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{refreshToken:undefined},{new:true}
        })
        const options={
            httpOnly:true,
            secure:true
        }
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{}),"User logged out successfully")
})


export {registerUser, loginUser, logoutUser}